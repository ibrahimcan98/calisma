import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebase-admin';

const ALLOWED_LESSON_COUNTS = new Set([3, 4, 8, 12, 15]);

export async function POST(req: Request) {
  try {
    const { lessonCount, userId, userEmail, metadata, accessToken, paymentSlug } = await req.json();
    const count = Number(lessonCount);
    let resolvedUserId = userId;
    let studentId = metadata?.studentId;

    if (paymentSlug) {
      const aliasSnapshot = await adminDb.doc(`publicPaymentLinks/${paymentSlug}`).get();
      const alias = aliasSnapshot.data();
      if (!aliasSnapshot.exists || !alias?.ownerId || !alias?.studentId) {
        return NextResponse.json({ error: 'Bu veli bağlantısı geçerli değil.' }, { status: 404 });
      }
      resolvedUserId = alias.ownerId;
      studentId = alias.studentId;
    }

    if (!resolvedUserId || !studentId || (!accessToken && !paymentSlug) || !ALLOWED_LESSON_COUNTS.has(count)) {
      return NextResponse.json({ error: 'Geçersiz ödeme bağlantısı veya ders paketi.' }, { status: 400 });
    }

    const studentSnapshot = await adminDb.doc(`users/${resolvedUserId}/students/${studentId}`).get();
    const student = studentSnapshot.data();

    if (!studentSnapshot.exists || !student || (!paymentSlug && student.paymentAccessToken !== accessToken)) {
      return NextResponse.json({ error: 'Bu ödeme bağlantısı geçerli değil.' }, { status: 403 });
    }

    const studentName = String(student.name || 'Öğrenci');
    const lessonPrice = Number(student.lessonPrice);
    if (!Number.isFinite(lessonPrice) || lessonPrice <= 0) {
      return NextResponse.json({ error: 'Ders ücreti tanımlı değil.' }, { status: 400 });
    }

    const isPound = ['ata', 'mila'].includes(studentName.toLocaleLowerCase('tr-TR'));
    const currencyCode = isPound ? 'gbp' : 'eur';
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const paymentPath = paymentSlug
      ? `/veli/${paymentSlug}`
      : `/pay/${resolvedUserId}/${studentId}/${accessToken}`;

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: currencyCode,
          product_data: {
            name: `${studentName} - ${count} Ders Paketi`,
            description: `${count} adet ders yüklemesi`,
          },
          unit_amount: Math.round(lessonPrice * count * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}${paymentPath}?payment=success&lessons=${count}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${paymentPath}?payment=cancelled`,
      ...(userEmail && userEmail.includes('@') ? { customer_email: userEmail } : {}),
      metadata: {
        userId: resolvedUserId,
        studentId,
        lessonCount: count.toString(),
        packageName: `${count} Ders Paketi`,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Ödeme başlatılamadı.';
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
