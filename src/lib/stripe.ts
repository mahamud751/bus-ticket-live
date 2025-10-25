import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
  typescript: true,
});

export const getStripePublishableKey = () => {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set");
  }
  return key;
};

// Stripe webhook signature verification
export const verifyWebhookSignature = (
  payload: string | Buffer,
  signature: string
): Stripe.Event => {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpointSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }

  return stripe.webhooks.constructEvent(payload, signature, endpointSecret);
};

// Currency configuration
export const CURRENCY = "usd";
export const CURRENCY_SYMBOL = "$";

// Convert amount to Stripe format (cents)
export const toStripeAmount = (amount: number): number => {
  return Math.round(amount * 100);
};

// Convert from Stripe format to regular amount
export const fromStripeAmount = (amount: number): number => {
  return amount / 100;
};
