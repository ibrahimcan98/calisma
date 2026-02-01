'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { BalanceLog, Student } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type StudentBalanceHistoryProps = {
  student: Student;
  formatCurrency: (amount: number) => string;
};

export function StudentBalanceHistory({ student, formatCurrency }: StudentBalanceHistoryProps) {
  const firestore = useFirestore();

  const balanceLogsQuery = useMemoFirebase(() => {
    if (!student?.userId || !student?.id) return null;
    const logsCollection = collection(firestore, 'users', student.userId, 'students', student.id, 'balanceLogs');
    return query(logsCollection, orderBy('date', 'desc'));
  }, [firestore, student?.userId, student?.id]);

  const { data: rawBalanceLogs, isLoading, error } = useCollection<BalanceLog>(balanceLogsQuery);

  const balanceLogs = useMemo(() => {
    if (!rawBalanceLogs) return [];
    return rawBalanceLogs.map(l => ({
      ...l,
      date: (l.date as any)?.toDate() ?? new Date(),
    }));
  }, [rawBalanceLogs]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <p className="p-4 text-destructive text-center">Bakiye geçmişi yüklenemedi.</p>;
  }

  if (!student) {
    return <p className="p-4 text-muted-foreground text-center">Öğrenci bilgisi bulunamadı.</p>;
  }

  return (
    <div className="bg-muted/50 rounded-b-md">
      <h4 className="font-semibold text-sm p-4 border-t">Bakiye Geçmişi</h4>
       <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tarih</TableHead>
            <TableHead>Açıklama</TableHead>
            <TableHead className="text-right">Değişim (Ders)</TableHead>
            <TableHead className="text-right">Yeni Bakiye (Ders)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {balanceLogs.length > 0 ? (
            balanceLogs.map((log) => {
              const lessonChange = student.lessonPrice > 0 ? (log.amountChanged / student.lessonPrice) : 0;
              const newLessonBalance = student.lessonPrice > 0 ? (log.newBalance / student.lessonPrice) : 0;

              return (
              <TableRow key={log.id}>
                <TableCell className="text-xs text-muted-foreground">{format(log.date, 'd MMM yy, HH:mm', { locale: tr })}</TableCell>
                <TableCell className="font-medium">{log.description}</TableCell>
                <TableCell className={cn("text-right font-medium", log.amountChanged > 0 ? 'text-green-600' : 'text-red-600')}>
                    {lessonChange > 0 ? '+' : ''}{lessonChange}
                </TableCell>
                <TableCell className="text-right font-semibold">{newLessonBalance.toFixed(1).replace('.',',')}</TableCell>
              </TableRow>
            )})
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                Bakiye geçmişi bulunmuyor.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
