import { authenticateRequest } from './auth';
import type { CheckoutRequest } from '../types/stripe';
import {
  ASSESSMENT_PACK_AMOUNT_CENTS,
  ASSESSMENT_PACK_CREDITS,
  ASSESSMENT_PACK_NAME
} from '../lib/assessmentPack';

interface Env {
  KV: KVNamespace;
  JWT_SECRET: string;
  FRONTEND_URL?: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PRICE_ID?: string;
}

/**
 * POST /api/checkout
 * Creates a Stripe Checkout session
 */
export async function handleCheckout(request: Request, env: Env) {
  try {
    const { token, resumePendingVerdict = false } = await request.json<Partial<CheckoutRequest>>();

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

    const returnPath = resumePendingVerdict ? '/unlock-verdict' : '/';
    const checkoutData = new URLSearchParams({
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(ASSESSMENT_PACK_AMOUNT_CENTS),
      'line_items[0][price_data][product_data][name]': ASSESSMENT_PACK_NAME,
      'line_items[0][quantity]': '1',
      'mode': 'payment',
      'success_url': `${frontendUrl}${returnPath}?purchase=assessments_success`,
      'cancel_url': `${frontendUrl}${returnPath}?purchase=assessments_cancelled`,
      'customer_email': email,
      'metadata[purchase_type]': 'assessment_pack',
      'metadata[test_credits]': String(ASSESSMENT_PACK_CREDITS),
      'metadata[resume_pending_verdict]': resumePendingVerdict ? 'true' : 'false'
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
