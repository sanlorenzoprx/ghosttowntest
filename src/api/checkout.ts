import { authenticateRequest } from './auth';
import type { CheckoutRequest } from '../types/stripe';

interface Env {
  KV: KVNamespace;
  JWT_SECRET: string;
  FRONTEND_URL?: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PRICE_ID: string;
}

/**
 * POST /api/checkout
 * Creates a Stripe Checkout session
 */
export async function handleCheckout(request: Request, env: Env) {
  try {
    const { token } = await request.json<Partial<CheckoutRequest>>();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'No token provided' }),
        { status: 401 }
      );
    }

    // Verify JWT and the account's current authVersion so revoked sessions
    // cannot open a checkout.
    const auth = await authenticateRequest(
      new Request(request.url, { headers: { Authorization: `Bearer ${token}` } }),
      env
    );
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401 }
      );
    }

    const email = auth.email;
    // Return customers to the frontend. The API host has no /success route.
    const frontendUrl = env.FRONTEND_URL?.replace(/\/$/, '') || new URL(request.url).origin;

    // Create Stripe Checkout session
    const checkoutData = new URLSearchParams({
      'line_items[0][price]': env.STRIPE_PRICE_ID,
      'line_items[0][quantity]': '1',
      'mode': 'payment',
      'success_url': `${frontendUrl}/?purchase=assessments_success`,
      'cancel_url': `${frontendUrl}/?purchase=assessments_cancelled`,
      'customer_email': email,
      'metadata[purchase_type]': 'assessment_pack',
      'metadata[test_credits]': '10'
    });

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: checkoutData.toString()
    });

    if (!stripeResponse.ok) {
      console.error('Stripe error:', await stripeResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to create checkout session' }),
        { status: 500 }
      );
    }

    const session = await stripeResponse.json() as any;

    return new Response(
      JSON.stringify({ sessionUrl: session.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Checkout error:', error);
    return new Response(
      JSON.stringify({ error: 'Checkout failed' }),
      { status: 500 }
    );
  }
}
