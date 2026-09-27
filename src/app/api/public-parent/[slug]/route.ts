import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const aliasSnapshot = await adminDb.doc(`publicPaymentLinks/${slug}`).get();

    if (!aliasSnapshot.exists) {
      return NextResponse.json({ error: 'Bu veli bağlantısı geçerli değil.' }, { status: 404 });
    }

    const alias = aliasSnapshot.data()!;
    const ownerId = String(alias.ownerId || '');
    const studentId = String(alias.studentId || '');
    if (!ownerId || !studentId) {
      return NextResponse.json({ error: 'Bu veli bağlantısı geçerli değil.' }, { status: 404 });
    }

    const [studentSnapshot, lessonLogsSnapshot] = await Promise.all([
      adminDb.doc(`users/${ownerId}/students/${studentId}`).get(),
      adminDb.collection(`users/${ownerId}/lessonLogs`).where('studentId', '==', studentId).get(),
    ]);

    if (!studentSnapshot.exists) {
      return NextResponse.json({ error: 'Öğrenci bulunamadı.' }, { status: 404 });
    }

    const student = studentSnapshot.data()!;
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
      ownerId,
      studentId,
      student: {
        name: String(student.name || 'Öğrenci'),
        balance: Number(student.balance) || 0,
        lessonPrice: Number(student.lessonPrice) || 0,
      },
      lessonLogs,
    });
  } catch (error) {
    console.error('Short parent page error:', error);
    return NextResponse.json({ error: 'Veli bilgileri yüklenemedi.' }, { status: 500 });
  }
}
