import { UserData, PublicUserData, LoginRequest } from '../types/auth';

export interface AuthEnv {
  KV: KVNamespace;
  JWT_SECRET: string;
}

// Cloudflare Workers Web Crypto rejects PBKDF2 counts above 100,000.
const PASSWORD_ITERATIONS = 100_000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function encodeBase64Url(value: string): string {
  return toBase64Url(new TextEncoder().encode(value));
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
}

async function derivePasswordHash(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer,
      iterations: PASSWORD_ITERATIONS
    },
    key,
    256
  );
  return toBase64Url(new Uint8Array(bits));
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${PASSWORD_ITERATIONS}$${toBase64Url(salt)}$${await derivePasswordHash(password, salt)}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [scheme, iterations, encodedSalt, expectedHash] = storedHash.split('$');
  if (scheme !== 'pbkdf2') return false;
  if (Number(iterations) !== PASSWORD_ITERATIONS || !encodedSalt || !expectedHash) return false;

  try {
    const base64 = encodedSalt.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encodedSalt.length / 4) * 4, '=');
    const binary = atob(base64);
    const salt = Uint8Array.from(binary, char => char.charCodeAt(0));
    return await derivePasswordHash(password, salt) === expectedHash;
  } catch {
    return false;
  }
}

function toPublicUser(user: UserData): PublicUserData {
  const {
    passwordHash: _passwordHash,
    authVersion: _authVersion,
    legacyPasswordMigratedAt: _legacyPasswordMigratedAt,
    ...publicUser
  } = user;
  return publicUser;
}

function currentAuthVersion(user: Pick<UserData, 'authVersion'>): number {
  return Number.isInteger(user.authVersion) && Number(user.authVersion) > 0
    ? Number(user.authVersion)
    : 1;
}

/**
 * Generate JWT token
 */
async function signToken(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))));
}

async function generateJWT(email: string, secret: string, authVersion = 1): Promise<string> {
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = encodeBase64Url(JSON.stringify({
    email,
    authVersion,
    iat: now,
    exp: now + 86400 * 30 // 30 days
  }));
  const signature = await signToken(`${header}.${payload}`, secret);
  return `${header}.${payload}.${signature}`;
}

/**
 * Verify JWT token
 */
export async function verifyJWT(
  token: string,
  secret: string
): Promise<{ email: string; authVersion: number } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const expectedSignature = await signToken(`${parts[0]}.${parts[1]}`, secret);
    if (parts[2] !== expectedSignature) return null;

    const payload = JSON.parse(decodeBase64Url(parts[1])) as {
      email?: unknown;
      exp?: unknown;
      authVersion?: unknown;
    };
    if (typeof payload.email !== 'string' || typeof payload.exp !== 'number') return null;
    if (payload.exp * 1000 < Date.now()) return null;
    if (payload.authVersion !== undefined && (
      typeof payload.authVersion !== 'number'
      || !Number.isInteger(payload.authVersion)
      || payload.authVersion < 1
    )) return null;
    // Tokens issued before Slice B have no authVersion. Treat them as version 1
    // so deployment does not log out every existing user; any subsequent
    // explicit session revocation increments the account version.
    return { email: payload.email, authVersion: payload.authVersion ?? 1 };
  } catch {
    return null;
  }
}

export async function authenticateRequest(
  request: Request,
  env: AuthEnv
): Promise<{ email: string; user: UserData } | null> {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return null;
  const userJson = await env.KV.get(`user_${payload.email}`);
  if (!userJson) return null;
  const user = JSON.parse(userJson) as UserData;
  if (payload.authVersion !== currentAuthVersion(user)) return null;
  return { email: payload.email, user };
}

/**
 * POST /api/auth/signup
 */
export async function handleSignup(request: Request, env: AuthEnv) {
  try {
    const body = await request.json<LoginRequest>();
    const email = normalizeEmail(body.email || '');
    const password = body.password;

    if (!email || !password || password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Invalid email or password (min 6 characters)' }),
        { status: 400 }
      );
    }

    // Check if user exists
    const existing = await env.KV.get(`user_${email}`);
    if (existing) {
      return new Response(
        JSON.stringify({ error: 'User already exists' }),
        { status: 409 }
      );
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const userData: UserData = {
      email,
      passwordHash,
      authVersion: 1,
      testsUsed: body.usedAnonymousAssessment ? 1 : 0,
      testsPurchased: 0,
      sharesGiven: 0,
      sharesReceived: 0,
      shareCredits: 0,
      createdAt: new Date().toISOString(),
      lastTestAt: null
    };

    await env.KV.put(`user_${email}`, JSON.stringify(userData));

    // Generate JWT
    const token = await generateJWT(email, env.JWT_SECRET, currentAuthVersion(userData));

    return new Response(
      JSON.stringify({ token, user: toPublicUser(userData) }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return new Response(
      JSON.stringify({ error: 'Signup failed' }),
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/login
 */
export async function handleLogin(request: Request, env: AuthEnv) {
  try {
    const body = await request.json<LoginRequest>();
    const email = normalizeEmail(body.email || '');
    const password = body.password;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password required' }),
        { status: 400 }
      );
    }

    // Fetch user
    const userJSON = await env.KV.get(`user_${email}`);
    if (!userJSON) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404 }
      );
    }

    const user = JSON.parse(userJSON) as UserData;

    // Only the current PBKDF2 scheme is accepted. The production account census
    // recorded zero legacy simpleHash accounts before this compatibility path was retired.
    if (!await verifyPassword(password, user.passwordHash)) {
      return new Response(
        JSON.stringify({ error: 'Invalid password' }),
        { status: 401 }
      );
    }

    const token = await generateJWT(email, env.JWT_SECRET, currentAuthVersion(user));

    return new Response(
      JSON.stringify({ token, user: toPublicUser(user) }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'Login failed' }),
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/verify
 */
export async function handleVerify(request: Request, env: AuthEnv) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'No token provided' }),
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token, env.JWT_SECRET);
    if (!payload) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401 }
      );
    }

    const userJSON = await env.KV.get(`user_${payload.email}`);
    if (!userJSON) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404 }
      );
    }

    const user = JSON.parse(userJSON) as UserData;
    if (payload.authVersion !== currentAuthVersion(user)) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401 }
      );
    }

    return new Response(
      JSON.stringify({ user: toPublicUser(user) }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Verify error:', error);
    return new Response(
      JSON.stringify({ error: 'Verification failed' }),
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/revoke-sessions
 *
 * Invalidates every currently issued JWT for the authenticated account by
 * incrementing the account authVersion. The current token is intentionally not
 * replaced: callers must log in again after a successful revocation.
 */
export async function handleRevokeSessions(request: Request, env: AuthEnv): Promise<Response> {
  const auth = await authenticateRequest(request, env);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  auth.user.authVersion = currentAuthVersion(auth.user) + 1;
  await env.KV.put(`user_${auth.email}`, JSON.stringify(auth.user));

  return new Response(JSON.stringify({ revoked: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-store'
    }
  });
}
