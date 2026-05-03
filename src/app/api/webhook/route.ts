import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    
    const { studentId, userId, lessonCount } = session.metadata;

    if (studentId && userId && lessonCount) {
      try {
        const count = parseInt(lessonCount, 10);
        const studentRef = adminDb.doc(`users/${userId}/students/${studentId}`);
        
        // Fetch student to get current price (or use price from metadata if preferred)
        const studentDoc = await studentRef.get();
        if (studentDoc.exists) {
            const studentData = studentDoc.data();
            const lessonPrice = studentData?.lessonPrice || 0;
            const amountToAdd = count * lessonPrice;

            // Atomic balance update
            await studentRef.update({
                balance: FieldValue.increment(amountToAdd)
            });

            // Log the balance change
            const balanceLogsRef = studentRef.collection('balanceLogs');
            await balanceLogsRef.add({
                userId,
                studentId,
                studentName: studentData?.name || 'Unknown',
                date: new Date(),
                amountChanged: amountToAdd,
                newBalance: (studentData?.balance || 0) + amountToAdd,
                description: `${count} derslik bakiye ödemesi (Stripe)`,
            });

            console.log(`✅ Success: Added ${count} lessons to student ${studentId}`);
        }
      } catch (error) {
        console.error('Error updating student balance via webhook:', error);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
