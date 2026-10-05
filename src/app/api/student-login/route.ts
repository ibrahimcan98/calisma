import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

type AttemptRecord = { count: number; resetAt: number };

declare global {
  var __studentLoginAttempts: Map<string, AttemptRecord> | undefined;
}

const attempts = global.__studentLoginAttempts || new Map<string, AttemptRecord>();
global.__studentLoginAttempts = attempts;

function clientKey(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  attempts.set(key, current);
  return current.count > MAX_ATTEMPTS;
}

export async function POST(request: Request) {
  const key = clientKey(request);
  if (isRateLimited(key)) {
    return NextResponse.json({ error: 'Çok fazla deneme yapıldı. Lütfen biraz bekleyin.' }, { status: 429 });
  }

  try {
    const authorization = request.headers.get('authorization') || '';
    const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!idToken) {
      return NextResponse.json({ error: 'Oturum doğrulanamadı.' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    if (decodedToken.firebase?.sign_in_provider !== 'anonymous') {
      return NextResponse.json({ error: 'Oturum doğrulanamadı.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null) as { pin?: unknown } | null;
    const pin = typeof body?.pin === 'string' ? body.pin.trim() : '';
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN geçersiz.' }, { status: 400 });
    }

    let snapshot = await adminDb.collectionGroup('students').where('pin', '==', pin).limit(1).get();
    if (snapshot.empty) {
      snapshot = await adminDb.collectionGroup('students').where('pin', '==', Number(pin)).limit(1).get();
    }

    if (snapshot.empty) {
      return NextResponse.json({ error: 'PIN geçersiz.' }, { status: 401 });
    }

    const studentDocument = snapshot.docs[0];
    const teacherId = studentDocument.ref.parent.parent?.id;
    if (!teacherId) {
      return NextResponse.json({ error: 'PIN geçersiz.' }, { status: 401 });
    }

    const studentId = studentDocument.id;
    await adminDb.doc(`studentSessions/${decodedToken.uid}`).set({
      teacherId,
      studentId,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + (24 * 60 * 60 * 1000)),
    });

    return NextResponse.json({
      studentToken: `student:${teacherId}:${studentId}`,
    });
  } catch (error) {
    console.error('Student PIN login failed:', error);
    return NextResponse.json({ error: 'Giriş şu anda tamamlanamadı.' }, { status: 500 });
  }
}
