'use client';

import { Header } from '@/components/header';
import { StudentDetailPage } from '@/components/student-detail-page';
import { useParams, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function StudentPage() {
  const params = useParams<{ userId: string; studentId: string }>();
  const { userId, studentId } = params;

  const searchParams = useSearchParams();
  const isParentMode = searchParams.get('mode') === 'parent';

  if (!userId || !studentId) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <p>Öğrenci bilgileri yüklenemedi. URL'yi kontrol edin.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      {!isParentMode && <Header />}
      <main className={cn("flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8", isParentMode && "pt-8")}>
        <StudentDetailPage userId={userId} studentId={studentId} isParentMode={isParentMode} />
      </main>
    </div>
  );
}
