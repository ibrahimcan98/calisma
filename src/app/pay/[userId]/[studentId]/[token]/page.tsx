'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { BookCheck, CalendarDays, Check, Hash, Loader2, User, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { checkout } from '@/lib/checkout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirestore } from '@/firebase';

type PublicPaymentData = {
  student: { name: string; balance: number; lessonPrice: number };
  lessonLogs: Array<{ id: string; date: string; lessonPrice: number }>;
};

export default function PublicPaymentPage() {
  const { userId, studentId, token } = useParams<{ userId: string; studentId: string; token: string }>();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const [data, setData] = useState<PublicPaymentData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDoc(doc(firestore, 'publicPaymentLinks', token))
      .then((snapshot) => {
        if (!snapshot.exists()) throw new Error('Bu ödeme bağlantısı henüz hazır değil. Öğretmeninizden bağlantıyı yeniden açmasını isteyin.');
        const publicData = snapshot.data();
        if (publicData.ownerId !== userId || publicData.studentId !== studentId) throw new Error('Bu ödeme bağlantısı geçerli değil.');
        const lessonLogs = Array.isArray(publicData.lessonLogs) ? publicData.lessonLogs.map((log: { id: string; date: unknown; lessonPrice: number }) => {
          const rawDate = log.date as { toDate?: () => Date } | string | number | Date;
          const date = typeof rawDate === 'object' && rawDate !== null && 'toDate' in rawDate && typeof rawDate.toDate === 'function' ? rawDate.toDate() : new Date(rawDate as string | number | Date);
          return { id: log.id, date: date.toISOString(), lessonPrice: Number(log.lessonPrice) || Number(publicData.lessonPrice) || 0 };
        }).sort((a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date)) : [];
        setData({
          student: { name: String(publicData.name || 'Öğrenci'), balance: Number(publicData.balance) || 0, lessonPrice: Number(publicData.lessonPrice) || 0 },
          lessonLogs,
        });
      })
      .catch((fetchError: Error) => setError(fetchError.message || 'Ödeme bilgileri yüklenemedi.'));
  }, [firestore, studentId, token, userId]);

  const stats = useMemo(() => {
    if (!data) return { completed: 0, purchased: 0, remaining: 0 };
    const completed = data.lessonLogs.length;
    const price = data.student.lessonPrice;
    const purchased = price > 0 ? Math.round((data.student.balance + completed * price) / price) : 0;
    const remaining = price > 0 ? Math.floor(data.student.balance / price) : 0;
    return { completed, purchased, remaining };
  }, [data]);

  if (error) return <main className="flex min-h-screen items-center justify-center bg-[#f4f9ff] p-6"><Card className="max-w-md"><CardHeader><CardTitle>Bağlantı açılamadı</CardTitle><CardDescription>{error}</CardDescription></CardHeader></Card></main>;
  if (!data) return <main className="flex min-h-screen items-center justify-center bg-[#f4f9ff]"><Loader2 className="h-10 w-10 animate-spin text-blue-500" /></main>;

  const isPound = ['ata', 'mila'].includes(data.student.name.toLocaleLowerCase('tr-TR'));
  const currency = (amount: number) => new Intl.NumberFormat(isPound ? 'en-GB' : 'de-DE', { style: 'currency', currency: isPound ? 'GBP' : 'EUR' }).format(amount);

  return (
    <main className="min-h-screen bg-[#f4f9ff] px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            {searchParams.get('payment') === 'success' && <div className="mb-4 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800"><Check className="h-6 w-6" /><span><strong>Ödeme başarılı!</strong> {searchParams.get('lessons')} derslik paket eklenecek.</span></div>}
            <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-blue-500" /> Ders Paketi Yükle</CardTitle>
            <CardDescription>Çocuğunuzun ders bakiyesini güvenli ödeme ile güncelleyebilirsiniz.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {[3, 4, 8, 12, 15].map((count) => <Button key={count} variant="outline" className="h-auto flex-col border-blue-200 bg-white py-4" onClick={() => checkout({ priceId: '', lessonCount: count, userId, metadata: { studentId }, accessToken: token })}><span className="text-lg font-bold">{count} Ders</span><span className="font-semibold text-blue-500">{currency(data.student.lessonPrice * count)}</span></Button>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-3 text-3xl"><User className="h-9 w-9 text-blue-500" /> {data.student.name}</CardTitle><CardDescription>Ders ve bakiye durumu</CardDescription></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-center md:grid-cols-3">
            <div className="rounded-xl bg-blue-50 p-4"><BookCheck className="mx-auto mb-2 h-8 w-8 text-green-600" /><p className="text-2xl font-bold">{stats.completed}</p><p className="text-sm text-slate-500">Tamamlanan Ders</p></div>
            <div className="rounded-xl bg-blue-50 p-4"><Hash className="mx-auto mb-2 h-8 w-8 text-blue-600" /><p className="text-2xl font-bold">{stats.purchased}</p><p className="text-sm text-slate-500">Toplam Alınan Ders</p></div>
            <div className="col-span-2 rounded-xl bg-blue-50 p-4 md:col-span-1"><CalendarDays className="mx-auto mb-2 h-8 w-8 text-amber-500" /><p className="text-2xl font-bold">{stats.remaining}</p><p className="text-sm text-slate-500">Kalan Ders</p></div>
          </CardContent>
        </Card>

        <Card><CardHeader><CardTitle>Geçmiş Dersler</CardTitle><CardDescription>Tamamlanan derslerin listesi.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Tarih</TableHead><TableHead className="text-right">Ders Ücreti</TableHead></TableRow></TableHeader><TableBody>{data.lessonLogs.length ? data.lessonLogs.map((log, index) => <TableRow key={log.id}><TableCell>{data.lessonLogs.length - index}</TableCell><TableCell>{format(new Date(log.date), 'd MMMM yyyy, EEEE HH:mm', { locale: tr })}</TableCell><TableCell className="text-right">{currency(log.lessonPrice)}</TableCell></TableRow>) : <TableRow><TableCell colSpan={3} className="h-24 text-center">Henüz işlenmiş ders yok.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
      </div>
    </main>
  );
}
