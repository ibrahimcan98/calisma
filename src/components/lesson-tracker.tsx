'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Student, LessonLog } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LinkIcon, Plus, Trash2, Users, Wallet, TrendingUp, BookUser, ChevronDown, Edit2, ArrowUp, ArrowDown, X } from 'lucide-react';
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
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { startOfWeek, format, isSameWeek, endOfWeek } from 'date-fns';
import { tr } from 'date-fns/locale';
import { StudentBalanceHistory } from './student-balance-history';

export function LessonTracker() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentLessonPrice, setNewStudentLessonPrice] = useState('');
  const [newStudentBalance, setNewStudentBalance] = useState('');
  const [fundsToAdd, setFundsToAdd] = useState<Record<string, string>>({});
  const [isMounted, setIsMounted] = useState(false);
  
  // Edit Student State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');

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
    })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.createdAt.getTime() - b.createdAt.getTime());
  }, [rawStudents]);
  
  const lessonLogs = useMemo(() => {
    if (!rawLessonLogs) return [];
    return rawLessonLogs.map(l => ({
      ...l,
      date: (l.date as any)?.toDate() ?? new Date(),
    })).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [rawLessonLogs]);

  const stats = useMemo(() => {
    if (!isMounted) return { totalEarnings: 0, logsByWeek: {}, sortedWeeks: [] };
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
  }, [lessonLogs, isMounted]);

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
      order: students.length,
    });
    setNewStudentName('');
    setNewStudentLessonPrice('');
    setNewStudentBalance('');
    toast({ title: "Öğrenci Eklendi", description: `${name} listeye eklendi.`});
  };

  const handleUpdateStudent = () => {
    if (!user || !editingStudent) return;
    const price = parseFloat(editPrice);
    if (!editName.trim() || isNaN(price) || price <= 0) return;

    const studentRef = doc(firestore, 'users', user.uid, 'students', editingStudent.id);
    updateDocumentNonBlocking(studentRef, {
      name: editName.trim(),
      lessonPrice: price,
    });
    setEditingStudent(null);
    toast({ title: "Güncellendi", description: "Öğrenci bilgileri güncellendi." });
  };

  const handleDeleteStudent = (id: string) => {
    if (!user) return;
    const studentRef = doc(firestore, 'users', user.uid, 'students', id);
    deleteDocumentNonBlocking(studentRef);
    toast({ variant: 'destructive', title: "Öğrenci Silindi", description: "Seçilen öğrenci listeden kaldırıldı."});
  };

  const handleMoveStudent = (student: Student, direction: 'up' | 'down') => {
    if (!user) return;
    const currentIndex = students.findIndex(s => s.id === student.id);
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === students.length - 1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetStudent = students[targetIndex];

    const currentRef = doc(firestore, 'users', user.uid, 'students', student.id);
    const targetRef = doc(firestore, 'users', user.uid, 'students', targetStudent.id);

    updateDocumentNonBlocking(currentRef, { order: targetIndex });
    updateDocumentNonBlocking(targetRef, { order: currentIndex });
  };
  
  const handleLessonDone = (student: Student, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleDeleteLessonLog = (log: LessonLog) => {
    if (!user) return;
    
    const student = students.find(s => s.id === log.studentId);
    if (student) {
      const studentRef = doc(firestore, 'users', user.uid, 'students', student.id);
      const newBalance = student.balance + log.lessonPrice;
      
      updateDocumentNonBlocking(studentRef, { balance: newBalance });

      const balanceLogsCollectionRef = collection(firestore, 'users', user.uid, 'students', student.id, 'balanceLogs');
      addDocumentNonBlocking(balanceLogsCollectionRef, {
          userId: user.uid,
          studentId: student.id,
          studentName: student.name,
          date: new Date(),
          amountChanged: log.lessonPrice,
          newBalance: newBalance,
          description: "Ders kaydı silindi, bakiye iade edildi",
      });
    }

    const logRef = doc(firestore, 'users', user.uid, 'lessonLogs', log.id);
    deleteDocumentNonBlocking(logRef);

    toast({ title: "Ders Silindi", description: "Ders kaydı silindi ve öğrenci bakiyesi iade edildi." });
  };
  
  const handleAddFunds = (student: Student, e: React.MouseEvent) => {
    e.stopPropagation();
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
            <div className="text-2xl font-bold">{isMounted ? formatCurrency(weeklyEarnings) : '...'}</div>
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
            <div className="text-2xl font-bold">{isMounted ? formatCurrency(stats.totalEarnings) : '...'}</div>
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
                  <Input type="number" placeholder="Başlangıç ders sayısı" value={newStudentBalance} onChange={(e) => setNewStudentBalance(e.target.value)} />
                  <Button onClick={handleAddStudent} className="w-full"><Plus className="mr-2 h-4 w-4" /> Ekle</Button>
              </div>
          </div>

          {students.length > 0 ? (
            <div className="w-full space-y-4">
              {students.map((student, index) => (
                <Accordion type="single" collapsible key={student.id} className="border rounded-md overflow-hidden bg-card">
                  <AccordionItem value={student.id} className="border-none">
                    <div className="flex items-center pr-4">
                      {/* Sorting Controls */}
                      <div className="flex flex-col gap-1 ml-4" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          disabled={index === 0}
                          onClick={() => handleMoveStudent(student, 'up')}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          disabled={index === students.length - 1}
                          onClick={() => handleMoveStudent(student, 'down')}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>

                      <AccordionTrigger asChild>
                        <div className="flex-1 flex items-center gap-4 p-4 cursor-pointer font-medium hover:no-underline">
                          <Users className="h-6 w-6 text-primary flex-shrink-0" />
                          <div className="flex-1 text-left">
                              <div className="flex items-center gap-2">
                                  <p className="font-bold text-lg">{student.name}</p>
                                  {user && (
                                    <Link 
                                      href={`/student/${user.uid}/${student.id}?mode=parent`} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <LinkIcon className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                    </Link>
                                  )}
                              </div>
                              <p className="text-sm text-muted-foreground">Ücret: {formatCurrency(student.lessonPrice)}</p>
                          </div>
                          <div className="w-32 text-center mx-4">
                              <p className="text-sm text-muted-foreground">Durum</p>
                              <p className={cn("font-bold text-xl", student.balance < 0 ? 'text-destructive' : 'text-green-600')}>
                                  {getRemainingLessonsText(student)}
                              </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      
                      <div className="hidden lg:flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleLessonDone(student, e)}
                          >
                            Dersi İşle
                          </Button>
                          <div className="flex gap-2">
                              <Input
                                  type="number"
                                  placeholder="Sayı"
                                  className="w-16 h-8"
                                  value={fundsToAdd[student.id] || ''}
                                  onChange={(e) => handleFundsInputChange(student.id, e.target.value)}
                              />
                              <Button
                                  size="sm"
                                  onClick={(e) => handleAddFunds(student, e)}
                              >
                                Ders Ekle
                              </Button>
                          </div>
                      </div>

                      <div className="ml-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setEditingStudent(student);
                              setEditName(student.name);
                              setEditPrice(student.lessonPrice.toString());
                            }}
                          >
                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                          </Button>

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
                                  "{student.name}" öğrencisi kalıcı olarak silinecektir.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteStudent(student.id)} className="bg-destructive hover:bg-destructive/90">Sil</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                    </div>

                    <AccordionContent>
                      <div className="p-4 flex flex-col lg:hidden gap-4 border-t border-b bg-muted/30" onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" className="w-full" onClick={(e) => handleLessonDone(student, e)}>Dersi İşle</Button>
                          <div className="flex w-full gap-2">
                              <Input
                                  type="number"
                                  placeholder="Ders sayısı"
                                  className="min-w-0"
                                  value={fundsToAdd[student.id] || ''}
                                  onChange={(e) => handleFundsInputChange(student.id, e.target.value)}
                              />
                              <Button className="w-full" onClick={(e) => handleAddFunds(student, e)}>Ders Ekle</Button>
                          </div>
                      </div>
                      {user && <StudentBalanceHistory student={student} formatCurrency={formatCurrency} />}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ))}
            </div>
          ) : !isStudentsLoading && (
              <div className="text-center p-12 border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground">Henüz öğrenci eklenmemiş.</p>
              </div>
          )}
          {isStudentsLoading && <p className="text-center p-12 text-muted-foreground">Yükleniyor...</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Ders Geçmişi</CardTitle>
            <CardDescription>Haftalık tamamlanan dersler. Yanlış kayıtları buradan silebilirsiniz.</CardDescription>
        </CardHeader>
        <CardContent>
            {lessonLogs.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                    {stats.sortedWeeks.map(weekKey => {
                        const weekData = stats.logsByWeek[weekKey];
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
                                            <li key={log.id} className="flex justify-between items-center text-sm group">
                                                <div className="flex items-center gap-2">
                                                  <span>{log.studentName}</span>
                                                  <span className="text-muted-foreground">{format(log.date, 'eeee, HH:mm', { locale: tr })}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <span className="font-medium">{formatCurrency(log.lessonPrice)}</span>
                                                  <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                      </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                      <AlertDialogHeader>
                                                        <AlertDialogTitle>Ders Kaydını Sil?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                          Bu ders kaydını silmek, öğrencinin bakiyesini iade edecek ve kalan ders sayısını 1 artıracaktır.
                                                        </AlertDialogDescription>
                                                      </AlertDialogHeader>
                                                      <AlertDialogFooter>
                                                        <AlertDialogCancel>İptal</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteLessonLog(log)} className="bg-destructive hover:bg-destructive/90">Sil ve İade Et</AlertDialogAction>
                                                      </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                  </AlertDialog>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            ) : (
                <p className="text-muted-foreground text-center py-8">Kayıt yok.</p>
            )}
        </CardContent>
      </Card>

      {/* Edit Student Dialog */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Öğrenci Bilgilerini Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Öğrenci Adı</label>
              <Input 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)} 
                placeholder="İsim"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ders Ücreti (€)</label>
              <Input 
                type="number" 
                value={editPrice} 
                onChange={(e) => setEditPrice(e.target.value)} 
                placeholder="Ücret"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStudent(null)}>İptal</Button>
            <Button onClick={handleUpdateStudent}>Güncelle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
