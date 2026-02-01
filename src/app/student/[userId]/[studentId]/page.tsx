'use client';

import { Header } from '@/components/header';
import { StudentDetailPage } from '@/components/student-detail-page';

type StudentPageProps = {
  params: {
    userId: string;
    studentId: string;
  };
};

export default function StudentPage({ params }: StudentPageProps) {
  const { userId, studentId } = params;

  if (!userId || !studentId) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <p>Öğrenci bilgileri yüklenemedi. URL'yi kontrol edin.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <StudentDetailPage userId={userId} studentId={studentId} />
      </main>
    </div>
  );
}
