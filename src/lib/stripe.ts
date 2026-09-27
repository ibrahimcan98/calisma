import Stripe from 'stripe';

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }

  return new Stripe(secretKey, {
    apiVersion: '2023-10-16' as any,
    typescript: true,
  });
}
