'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp, query, where, limit } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Student, LessonLog, BalanceLog } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LinkIcon, Plus, Trash2, Users, Wallet, TrendingUp, BookUser, Activity } from 'lucide-react';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { startOfWeek, endOfWeek, format, isSameWeek } from 'date-fns';
import { tr } from 'date-fns/locale';
import { StudentBalanceHistory } from './student-balance-history';

const initialStudentNames = [
  'Ata', 'Mila', 'Batu', 'Ozan', 'Leo', 'Selen', 'Beliz', 'Leyla', 'Lila', 'Ali', 'Lyla'
];

export function LessonTracker() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentLessonPrice, setNewStudentLessonPrice] = useState('');
  const [newStudentBalance, setNewStudentBalance] = useState('');
  const [fundsToAdd, setFundsToAdd] = useState<Record<string, string>>({});
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const studentsCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'students');
  }, [firestore, user]);

  const lessonLogsCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'lessonLogs');
  }, [firestore, user]);

  const { data: rawStudents, isLoading: isStudentsLoading } = useCollection<Omit<Student, 'id'>>(studentsCollectionRef);
  const { data: rawLessonLogs } = useCollection<Omit<LessonLog, 'id'>>(lessonLogsCollectionRef);

  const students = useMemo(() => {
    if (!rawStudents) return [];
    return rawStudents.map(s => ({
      ...s,
      createdAt: (s.createdAt as any)?.toDate() ?? new Date(),
    })).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }, [rawStudents]);
  
  const lessonLogs = useMemo(() => {
    if (!rawLessonLogs) return [];
    return rawLessonLogs.map(l => ({
      ...l,
      date: (l.date as any)?.toDate() ?? new Date(),
    })).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [rawLessonLogs]);

  const { totalEarnings, logsByWeek, sortedWeeks } = useMemo(() => {
    const totalEarnings = lessonLogs.reduce((sum, log) => sum + log.lessonPrice, 0);

    const logsByWeek = lessonLogs.reduce<Record<string, { lessons: LessonLog[], totalEarnings: number, startDate: Date }>>((acc, log) => {
        const weekStart = startOfWeek(log.date, { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        
        if (!acc[weekKey]) {
            acc[weekKey] = {
                lessons: [],
                totalEarnings: 0,
                startDate: weekStart,
            };
        }
        acc[weekKey].lessons.push(log);
        acc[weekKey].totalEarnings += log.lessonPrice;
        return acc;
    }, {});
    
    const sortedWeeks = Object.keys(logsByWeek).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return { totalEarnings, logsByWeek, sortedWeeks };
  }, [lessonLogs]);

  const weeklyEarnings = useMemo(() => {
    if (!isMounted) return 0;
    const now = new Date();
    const currentWeekLogs = lessonLogs.filter(log => isSameWeek(log.date, now, { weekStartsOn: 1 }));
    return currentWeekLogs.reduce((sum, log) => sum + log.lessonPrice, 0);
  }, [lessonLogs, isMounted]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };
  
  const getRemainingLessonsText = (student: Student): string => {
      if (!student.lessonPrice || student.lessonPrice <= 0) {
          return "Ders ücreti tanımsız";
      }
      const remaining = student.balance / student.lessonPrice;
      if (remaining >= 0) {
          const fullLessons = Math.floor(remaining);
          return `${fullLessons} ders`;
      } else {
          return `${Math.ceil(Math.abs(remaining))} ders borçlu`;
      }
  };


  const handleAddStudent = () => {
    const name = newStudentName.trim();
    const lessonPrice = parseFloat(newStudentLessonPrice);
    const startingLessons = parseInt(newStudentBalance, 10) || 0;
    const balance = startingLessons * (lessonPrice || 0);

    if (!studentsCollectionRef || !user || !name || isNaN(lessonPrice) || lessonPrice <= 0) {
      toast({
        variant: 'destructive',
        title: 'Geçersiz Giriş',
        description: 'Lütfen geçerli bir öğrenci adı ve pozitif bir ders ücreti girin.',
      });
      return;
    }

    addDocumentNonBlocking(studentsCollectionRef, {
      name,
      lessonPrice,
      balance,
      userId: user.uid,
      createdAt: serverTimestamp(),
    });
    setNewStudentName('');
    setNewStudentLessonPrice('');
    setNewStudentBalance('');
    toast({ title: "Öğrenci Eklendi", description: `${name} listeye eklendi.`});
  };

  const handleDeleteStudent = (id: string) => {
    if (!user) return;
    const studentRef = doc(firestore, 'users', user.uid, 'students', id);
    deleteDocumentNonBlocking(studentRef);
    toast({ variant: 'destructive', title: "Öğrenci Silindi", description: "Seçilen öğrenci listeden kaldırıldı."});
  };
  
  const handleLessonDone = (student: Student) => {
    if (!user || !lessonLogsCollectionRef) return;
    const studentRef = doc(firestore, 'users', user.uid, 'students', student.id);
    const newBalance = student.balance - student.lessonPrice;
    
    updateDocumentNonBlocking(studentRef, { balance: newBalance });

    addDocumentNonBlocking(lessonLogsCollectionRef, {
        userId: user.uid,
        studentId: student.id,
        studentName: student.name,
        date: new Date(),
        lessonPrice: student.lessonPrice,
    });

    const balanceLogsCollectionRef = collection(firestore, 'users', user.uid, 'students', student.id, 'balanceLogs');
    addDocumentNonBlocking(balanceLogsCollectionRef, {
        userId: user.uid,
        studentId: student.id,
        studentName: student.name,
        date: new Date(),
        amountChanged: -student.lessonPrice,
        newBalance: newBalance,
        description: "Ders işlendi",
    });
    
    toast({ title: "Ders İşlendi", description: `${student.name} için bakiye güncellendi.`});
  };
  
  const handleAddFunds = (student: Student) => {
    if (!user) return;
    const lessonCount = parseInt(fundsToAdd[student.id] || '0', 10);

    if (isNaN(lessonCount) || lessonCount <= 0 || !student.lessonPrice) {
      toast({
        variant: 'destructive',
        title: 'Geçersiz Ders Sayısı',
        description: 'Lütfen pozitif bir ders sayısı girin.',
      });
      return;
    }
    
    const amountToAdd = lessonCount * student.lessonPrice;
    const newBalance = student.balance + amountToAdd;

    const studentRef = doc(firestore, 'users', user.uid, 'students', student.id);
    updateDocumentNonBlocking(studentRef, { balance: newBalance });

    const balanceLogsCollectionRef = collection(firestore, 'users', user.uid, 'students', student.id, 'balanceLogs');
    addDocumentNonBlocking(balanceLogsCollectionRef, {
        userId: user.uid,
        studentId: student.id,
        studentName: student.name,
        date: new Date(),
        amountChanged: amountToAdd,
        newBalance: newBalance,
        description: `${lessonCount} derslik bakiye eklendi`,
    });
    
    setFundsToAdd(prev => ({...prev, [student.id]: ''}));

    toast({ title: "Bakiye Güncellendi", description: `${student.name} için ${lessonCount} derslik bakiye eklendi.`});
  };

  const handleFundsInputChange = (studentId: string, value: string) => {
    setFundsToAdd(prev => ({ ...prev, [studentId]: value }));
  };

  const handleSeedInitialStudents = () => {
    if (!studentsCollectionRef || !user) return;
    initialStudentNames.forEach(name => {
      addDocumentNonBlocking(studentsCollectionRef, {
        name: name,
        balance: 0,
        lessonPrice: 100,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
    });
    toast({ title: "Başlangıç Listesi Eklendi", description: "Öğrenciler başarıyla eklendi."});
  };

  const handleResetWeeklyEarnings = () => {
    if (!user || !lessonLogs) return;
    const now = new Date();
    const currentWeekLogs = lessonLogs.filter(log => isSameWeek(log.date, now, { weekStartsOn: 1 }));

    if (currentWeekLogs.length === 0) {
      toast({
        title: "Sıfırlanacak Kayıt Yok",
        description: "Bu hafta için zaten ders kaydı bulunmuyor.",
      });
      return;
    }
    
    currentWeekLogs.forEach(log => {
      const logRef = doc(firestore, 'users', user.uid, 'lessonLogs', log.id);
      deleteDocumentNonBlocking(logRef);
    });

    toast({
      title: "Haftalık Kazanç Sıfırlandı",
      description: `Bu haftaya ait ${currentWeekLogs.length} ders kaydı silindi.`,
    });
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bu Haftalık Kazanç</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(weeklyEarnings)}</div>
            <p className="text-xs text-muted-foreground">Bu hafta tamamlanan derslerin toplamı</p>
          </CardContent>
           <CardFooter>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">Haftalık Kazancı Sıfırla</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Haftalık Kazancı Sıfırla?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Bu işlem geri alınamaz. Bu haftaya ait tüm ders kayıtları kalıcı olarak silinecek ve haftalık kazanç sıfırlanacaktır. Emin misiniz?
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>İptal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetWeeklyEarnings} className="bg-destructive hover:bg-destructive/90">Evet, Sıfırla</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Kazanç</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">Tüm zamanların toplam ders geliri</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Öğrenci</CardTitle>
            <BookUser className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground">Toplam kayıtlı öğrenci sayısı</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Öğrenci Yönetimi</CardTitle>
          <CardDescription>Öğrencilerin ders ve bakiye durumlarını buradan yönetebilirsiniz.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 border rounded-lg space-y-2 bg-muted/50">
              <h3 className="font-semibold">Yeni Öğrenci Ekle</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <Input placeholder="Yeni öğrenci adı" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} />
                  <Input type="number" placeholder="Ders ücreti" value={newStudentLessonPrice} onChange={(e) => setNewStudentLessonPrice(e.target.value)} />
                  <Input type="number" placeholder="Başlangıç ders sayısı (opsiyonel)" value={newStudentBalance} onChange={(e) => setNewStudentBalance(e.target.value)} />
                  <Button onClick={handleAddStudent} className="w-full"><Plus className="mr-2 h-4 w-4" /> Ekle</Button>
              </div>
          </div>

          {students.length > 0 ? (
            <Accordion type="single" collapsible className="w-full space-y-4">
              {students.map(student => (
                <AccordionItem value={student.id} key={student.id} className="border-none">
                  <div className="border rounded-md">
                    <AccordionTrigger className="p-4 hover:no-underline [&[data-state=open]]:border-b">
                      <div className="flex-1 flex items-center gap-4 text-left">
                          <Users className="h-6 w-6 text-primary flex-shrink-0" />
                          <div>
                              <div className="flex items-center gap-2">
                                  <p className="font-bold text-lg">{student.name}</p>
                                  {user && (
                                    <Link 
                                      href={`/student/${user.uid}/${student.id}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      aria-label={`${student.name} rapor sayfasını aç`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <LinkIcon className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                    </Link>
                                  )}
                              </div>
                              <p className="text-sm text-muted-foreground">Ders Ücreti: {formatCurrency(student.lessonPrice)}</p>
                          </div>
                      </div>
                      <div className="w-full sm:w-32 text-center mx-4">
                          <p className="text-sm text-muted-foreground">Kalan Ders</p>
                          <p className={cn("font-bold text-xl", student.balance < 0 ? 'text-destructive' : 'text-green-600')}>
                              {getRemainingLessonsText(student)}
                          </p>
                      </div>
                      <div className="hidden lg:flex flex-1 flex-row gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" className="w-full sm:w-auto" onClick={() => handleLessonDone(student)}>
                            Dersi İşle
                          </Button>
                          <div className="flex w-full sm:w-auto gap-2">
                              <Input
                                  type="number"
                                  placeholder="Ders sayısı"
                                  className="min-w-0"
                                  value={fundsToAdd[student.id] || ''}
                                  onChange={(e) => handleFundsInputChange(student.id, e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleAddFunds(student)}
                              />
                              <Button className="w-full sm:w-auto" onClick={() => handleAddFunds(student)}>
                                Ders Ekle
                              </Button>
                          </div>
                      </div>
                      <div className="flex-none ml-2" onClick={(e) => e.stopPropagation()}>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Bu işlem geri alınamaz. "{student.name}" öğrencisi kalıcı olarak silinecektir.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteStudent(student.id)} className="bg-destructive hover:bg-destructive/90">Sil</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="p-4 flex flex-col lg:hidden gap-4 border-b" onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" className="w-full" onClick={() => handleLessonDone(student)}>Dersi İşle</Button>
                          <div className="flex w-full gap-2">
                              <Input
                                  type="number"
                                  placeholder="Ders sayısı"
                                  className="min-w-0"
                                  value={fundsToAdd[student.id] || ''}
                                  onChange={(e) => handleFundsInputChange(student.id, e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleAddFunds(student)}
                              />
                              <Button className="w-full" onClick={() => handleAddFunds(student)}>Ders Ekle</Button>
                          </div>
                      </div>
                      {user && <StudentBalanceHistory student={student} formatCurrency={formatCurrency} />}
                    </AccordionContent>
                  </div>
                </AccordionItem>
              ))}
            </Accordion>
          ) : !isStudentsLoading && (
              <div className="text-center p-12">
                  <p className="text-muted-foreground mb-4">Henüz öğrenci eklenmemiş.</p>
                  <Button onClick={handleSeedInitialStudents}>
                      Başlangıç Listesini Ekle
                  </Button>
              </div>
          )}
          {isStudentsLoading && <p className="text-center p-12 text-muted-foreground">Öğrenciler yükleniyor...</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Ders Geçmişi</CardTitle>
            <CardDescription>Tamamlanan dersleri hafta hafta görüntüleyin.</CardDescription>
        </CardHeader>
        <CardContent>
            {lessonLogs.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                    {sortedWeeks.map(weekKey => {
                        const weekData = logsByWeek[weekKey];
                        const weekEnd = endOfWeek(weekData.startDate, { weekStartsOn: 1 });
                        const weekLabel = `${format(weekData.startDate, 'd MMM', { locale: tr })} - ${format(weekEnd, 'd MMM yyyy', { locale: tr })}`;
                        
                        return (
                            <AccordionItem value={weekKey} key={weekKey}>
                                <AccordionTrigger>
                                    <div className="flex justify-between w-full pr-4">
                                        <span>{weekLabel}</span>
                                        <span className="font-semibold text-primary">{formatCurrency(weekData.totalEarnings)}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <ul className="space-y-2 pl-2">
                                        {weekData.lessons.map(log => (
                                            <li key={log.id} className="flex justify-between items-center text-sm">
                                                <span>{log.studentName}</span>
                                                <span className="text-muted-foreground">{format(log.date, 'eeee, HH:mm', { locale: tr })}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            ) : (
                <p className="text-muted-foreground text-center py-8">Henüz işlenmiş ders kaydı yok.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
