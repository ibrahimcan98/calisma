import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

type RouteContext = {
  params: Promise<{ userId: string; studentId: string; token: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { userId, studentId, token } = await context.params;
    const studentRef = adminDb.doc(`users/${userId}/students/${studentId}`);
    const [studentSnapshot, lessonLogsSnapshot] = await Promise.all([
      studentRef.get(),
      adminDb.collection(`users/${userId}/lessonLogs`).where('studentId', '==', studentId).get(),
    ]);
    const student = studentSnapshot.data();

    if (!studentSnapshot.exists || !token || student?.paymentAccessToken !== token) {
      return NextResponse.json({ error: 'Bu ödeme bağlantısı geçerli değil.' }, { status: 404 });
    }

    const lessonLogs = lessonLogsSnapshot.docs
      .map((document) => {
        const data = document.data();
        const rawDate = data.date;
        const date = typeof rawDate?.toDate === 'function' ? rawDate.toDate() : new Date(rawDate);
        return {
          id: document.id,
          date: Number.isNaN(date.getTime()) ? null : date.toISOString(),
          lessonPrice: Number(data.lessonPrice) || Number(student.lessonPrice) || 0,
        };
      })
      .filter((log) => log.date)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));

    return NextResponse.json({
      student: {
        name: String(student.name || 'Öğrenci'),
        balance: Number(student.balance) || 0,
        lessonPrice: Number(student.lessonPrice) || 0,
      },
      lessonLogs,
    });
  } catch (error) {
    console.error('Public payment page error:', error);
    return NextResponse.json({ error: 'Ödeme bilgileri yüklenemedi.' }, { status: 500 });
  }
}
