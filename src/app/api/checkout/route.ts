import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    const { priceId, amount, lessonCount, studentName, userId, userEmail, metadata } = await req.json();

    const line_items: any[] = [];
    
    if (priceId) {
      line_items.push({
        price: priceId,
        quantity: 1,
      });
    } else if (amount && lessonCount) {
      // Dynamic price calculation
      const isPound = studentName?.toLowerCase() === 'ata' || studentName?.toLowerCase() === 'mila';
      const currencyCode = isPound ? 'gbp' : 'eur';

      line_items.push({
        price_data: {
          currency: currencyCode,
          product_data: {
            name: `${studentName} - ${lessonCount} Ders Paketi`,
            description: `${lessonCount} adet ders yüklemesi`,
          },
          unit_amount: Math.round(amount * 100), // Stripe cents cinsinden bekler
        },
        quantity: 1,
      });
    } else {
      return NextResponse.json({ error: 'Price ID or dynamic amount is required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/student/${userId}/${metadata.studentId}?payment=success&mode=parent&lessons=${lessonCount}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/student/${userId}/${metadata.studentId}?payment=cancelled&mode=parent`,
      ...(userEmail && userEmail.includes('@') ? { customer_email: userEmail } : {}),
      metadata: {
        userId: userId,
        studentId: metadata.studentId,
        lessonCount: lessonCount?.toString(),
        ...metadata,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
