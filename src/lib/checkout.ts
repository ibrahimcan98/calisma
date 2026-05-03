import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export async function checkout({ priceId, amount, lessonCount, studentName, userId, userEmail, metadata }: { 
  priceId: string; 
  amount?: number;
  lessonCount?: number;
  studentName?: string;
  userId?: string; 
  userEmail?: string;
  metadata?: any;
}) {
  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        amount,
        lessonCount,
        studentName,
        userId,
        userEmail,
        metadata,
      }),
    });

    const session = await response.json();

    if (session.error) {
      throw new Error(session.error);
    }

    if (session.url) {
      window.location.href = session.url;
    } else {
      const stripe = await stripePromise;
      const { error } = await stripe!.redirectToCheckout({
        sessionId: session.sessionId,
      });

      if (error) {
        throw new Error(error.message);
      }
    }
  } catch (error) {
    console.error('Checkout Error:', error);
    alert('Ödeme başlatılırken bir hata oluştu. Lütfen tekrar deneyin.');
  }
}
