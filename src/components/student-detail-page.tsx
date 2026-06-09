'use client';

import { useMemo } from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import type { Student, LessonLog } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'next/navigation';
import { Loader2, User, BookCheck, BookX, CalendarDays, Hash, Wallet, Check } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { checkout } from '@/lib/checkout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StudentBalanceHistory } from './student-balance-history';

type StudentDetailPageProps = {
  userId: string;
  studentId: string;
  isParentMode?: boolean;
};

export function StudentDetailPage({ userId, studentId, isParentMode = false }: StudentDetailPageProps) {
  const searchParams = useSearchParams();
  const firestore = useFirestore();

  const studentDocRef = useMemoFirebase(() => {
    return doc(firestore, 'users', userId, 'students', studentId);
  }, [firestore, userId, studentId]);

  const lessonLogsQuery = useMemoFirebase(() => {
    const logsCollection = collection(firestore, 'users', userId, 'lessonLogs');
    return query(logsCollection, where('studentId', '==', studentId));
  }, [firestore, userId, studentId]);

  const { data: student, isLoading: isStudentLoading, error: studentError } = useDoc<Student>(studentDocRef);
  const { data: rawLessonLogs, isLoading: areLogsLoading, error: logsError } = useCollection<LessonLog>(lessonLogsQuery);

  const lessonLogs = useMemo(() => {
    if (!rawLessonLogs) return [];
    return rawLessonLogs.map(l => ({
      ...l,
      date: (l.date as any)?.toDate() ?? new Date(),
    })).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [rawLessonLogs]);

  const stats = useMemo(() => {
    if (!student) {
      return {
        remainingLessons: 0,
        totalLessonsPurchased: 0,
        completedLessons: 0,
        debtLessons: 0,
        isDebt: false,
      };
    }
    const completedLessons = lessonLogs?.length ?? 0;
    const totalPaid = student.balance + (completedLessons * student.lessonPrice);
    const totalLessonsPurchased = student.lessonPrice > 0 ? Math.round(totalPaid / student.lessonPrice) : 0;
    
    return {
      remainingLessons: student.lessonPrice > 0 ? Math.floor(student.balance / student.lessonPrice) : 0,
      debtLessons: student.lessonPrice > 0 ? Math.ceil(Math.abs(student.balance) / student.lessonPrice) : 0,
      isDebt: student.balance < 0,
      completedLessons: completedLessons,
      totalLessonsPurchased: totalLessonsPurchased,
    };
  }, [student, lessonLogs]);

  const formatCurrency = (amount: number) => {
    const isPound = student?.name.toLowerCase() === 'ata' || student?.name.toLowerCase() === 'mila';
    return new Intl.NumberFormat(isPound ? 'en-GB' : 'de-DE', {
      style: 'currency',
      currency: isPound ? 'GBP' : 'EUR',
    }).format(amount);
  };

  const handlePurchase = (lessonCount: number) => {
    if (!student) return;
    checkout({
      priceId: '', // price_data used in API if empty
      amount: student.lessonPrice * lessonCount,
      lessonCount,
      studentName: student.name,
      userId,
      userEmail: '', // Optional
      metadata: {
        studentId: studentId,
        packageName: `${lessonCount} Ders Paketi`,
      },
    });
  };

  if (isStudentLoading || areLogsLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (studentError || logsError) {
      return (
          <div className="flex flex-col items-center justify-center h-64 text-destructive">
              <p>Veri yüklenirken bir hata oluştu.</p>
              <p className="text-xs text-muted-foreground">{studentError?.message || logsError?.message}</p>
          </div>
      )
  }

  if (!student) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <p>Öğrenci bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl w-full space-y-8">
      {/* Veli Satın Alma Bölümü */}
      {isParentMode && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            {/* Ödeme Başarılı Mesajı */}
            {searchParams.get('payment') === 'success' && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                <div className="h-10 w-10 bg-green-500 rounded-full flex items-center justify-center text-white shrink-0">
                  <Check className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900">Ödeme Başarılı!</h3>
                  <p className="text-sm text-green-700">
                    {searchParams.get('lessons')} derslik paket başarıyla satın alındı. Bakiyeniz en kısa sürede güncellenecektir.
                  </p>
                </div>
              </div>
            )}
            <CardTitle className="text-xl flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Ders Paketi Yükle
            </CardTitle>
            <CardDescription>
              Çocuğunuzun ders bakiyesini buradan hızlıca güncelleyebilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[4, 8, 12, 15].map((count) => (
                <Button 
                  key={count} 
                  variant="outline" 
                  className="flex flex-col h-auto py-4 bg-background hover:bg-primary/10 border-primary/20"
                  onClick={() => handlePurchase(count)}
                >
                  <span className="text-lg font-bold">{count} Ders</span>
                  <span className="text-sm text-primary font-semibold">
                    {formatCurrency(student.lessonPrice * count)}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <User className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl">{student.name}</CardTitle>
              <CardDescription>Ders ve Bakiye Durumu Raporu</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                  <BookCheck className="mx-auto h-8 w-8 text-green-600 mb-2" />
                  <p className="text-2xl font-bold">{stats.completedLessons}</p>
                  <p className="text-sm text-muted-foreground">Tamamlanan Ders</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                  <Hash className="mx-auto h-8 w-8 text-blue-600 mb-2" />
                  <p className="text-2xl font-bold">{stats.totalLessonsPurchased}</p>
                  <p className="text-sm text-muted-foreground">Toplam Alınan Ders</p>
              </div>
              <div className="p-4 bg-muted rounded-lg col-span-2 md:col-span-1">
                  {stats.isDebt ? (
                      <>
                        <BookX className="mx-auto h-8 w-8 text-red-600 mb-2" />
                        <p className="text-2xl font-bold">{stats.debtLessons} Ders</p>
                        <p className="text-sm text-muted-foreground">Borçlu</p>
                      </>
                  ) : (
                      <>
                        <CalendarDays className="mx-auto h-8 w-8 text-yellow-600 mb-2" />
                        <p className="text-2xl font-bold">{stats.remainingLessons}</p>
                        <p className="text-sm text-muted-foreground">Kalan Ders</p>
                      </>
                  )}
              </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
              <CardTitle>Geçmiş Dersler</CardTitle>
              <CardDescription>Tamamlanan tüm derslerin listesi.</CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">#</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead className="text-right">Ders Ücreti</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lessonLogs.length > 0 ? (
                    lessonLogs.map((log, index) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{lessonLogs.length - index}</TableCell>
                        <TableCell>{format(log.date, 'd MMMM yyyy, EEEE HH:mm', { locale: tr })}</TableCell>
                        <TableCell className="text-right">{formatCurrency(log.lessonPrice)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        Henüz işlenmiş ders kaydı yok.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
          </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bakiye Geçmişi</CardTitle>
          <CardDescription>Öğrencinin tüm bakiye hareketlerinin listesi.</CardDescription>
        </CardHeader>
        <CardContent>
          <StudentBalanceHistory student={student} formatCurrency={formatCurrency} />
        </CardContent>
      </Card>
    </div>
  );
}
