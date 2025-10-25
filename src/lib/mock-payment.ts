// Mock payment system for development when Stripe keys are not available
export interface MockPaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status:
    | "succeeded"
    | "requires_payment_method"
    | "requires_confirmation"
    | "processing"
    | "requires_action";
  client_secret: string;
}

export class MockPaymentError extends Error {
  type: string;
  code?: string;
  statusCode: number;

  constructor(message: string, type = "mock_payment_error", statusCode = 400) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.name = "MockPaymentError";
  }
}

export const createMockPaymentIntent = async (
  amount: number,
  currency = "usd"
): Promise<MockPaymentIntent> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Generate mock payment intent ID
  const paymentIntentId = `pi_mock_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  return {
    id: paymentIntentId,
    amount: Math.round(amount * 100), // Convert to cents like Stripe
    currency,
    status: "requires_payment_method",
    client_secret: `${paymentIntentId}_secret_${Math.random()
      .toString(36)
      .substr(2, 9)}`,
  };
};

export const confirmMockPayment = async (
  paymentIntentId: string
): Promise<MockPaymentIntent> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Simulate different outcomes for testing
  const random = Math.random();

  if (random < 0.05) {
    // 5% failure rate for testing
    throw new MockPaymentError("Your card was declined.", "card_declined", 402);
  }

  if (random < 0.1) {
    // Additional 5% for insufficient funds
    throw new MockPaymentError(
      "Your card has insufficient funds.",
      "insufficient_funds",
      402
    );
  }

  return {
    id: paymentIntentId,
    amount: 5000, // Mock amount in cents
    currency: "usd",
    status: "succeeded",
    client_secret: `${paymentIntentId}_secret_confirmed`,
  };
};

// Check if we should force mock payment mode (useful for development)
const shouldForceMockPayment = (): boolean => {
  // Check for FORCE_MOCK_PAYMENT environment variable
  return process.env.FORCE_MOCK_PAYMENT === "true";
};

export const isStripeConfigured = (): boolean => {
  // If FORCE_MOCK_PAYMENT is set to true, always return false to use mock payment
  if (shouldForceMockPayment()) {
    return false;
  }

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const secretKey = process.env.STRIPE_SECRET_KEY;

  return !!(
    publishableKey &&
    secretKey &&
    publishableKey.startsWith("pk_test_") &&
    secretKey.startsWith("sk_test_") &&
    publishableKey.length > 20 &&
    secretKey.length > 20
  );
};
