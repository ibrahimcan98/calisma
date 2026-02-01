'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Student } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Users } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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

  const studentsCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'students');
  }, [firestore, user]);

  const { data: rawStudents, isLoading } = useCollection<Omit<Student, 'id'>>(studentsCollectionRef);

  const students = useMemo(() => {
    if (!rawStudents) return [];
    return rawStudents.map(s => ({
      ...s,
      createdAt: (s.createdAt as any)?.toDate() ?? new Date(),
    })).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }, [rawStudents]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const handleAddStudent = () => {
    const name = newStudentName.trim();
    const lessonPrice = parseFloat(newStudentLessonPrice);
    const balance = parseFloat(newStudentBalance) || 0;

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
    if (!user) return;
    const studentRef = doc(firestore, 'users', user.uid, 'students', student.id);
    const newBalance = student.balance - student.lessonPrice;
    updateDocumentNonBlocking(studentRef, { balance: newBalance });
    toast({ title: "Ders İşlendi", description: `${student.name} için bakiye güncellendi. Yeni bakiye: ${formatCurrency(newBalance)}`});
  };
  
  const handleAddFunds = (student: Student) => {
    if (!user) return;
    const amount = parseFloat(fundsToAdd[student.id] || '0');

    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Geçersiz Tutar',
        description: 'Lütfen eklenecek pozitif bir tutar girin.',
      });
      return;
    }

    const studentRef = doc(firestore, 'users', user.uid, 'students', student.id);
    const newBalance = student.balance + amount;
    updateDocumentNonBlocking(studentRef, { balance: newBalance });
    
    // Clear input
    setFundsToAdd(prev => ({...prev, [student.id]: ''}));

    toast({ title: "Bakiye Eklendi", description: `${student.name} için bakiye güncellendi. Yeni bakiye: ${formatCurrency(newBalance)}`});
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
        lessonPrice: 100, // Default price, can be edited later
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
    });
    toast({ title: "Başlangıç Listesi Eklendi", description: "Öğrenciler başarıyla eklendi."});
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ders Takibi</CardTitle>
        <CardDescription>Öğrencilerin ders ve bakiye durumlarını buradan yönetebilirsiniz.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 border rounded-lg space-y-2 bg-muted/50">
            <h3 className="font-semibold">Yeni Öğrenci Ekle</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Input placeholder="Yeni öğrenci adı" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} />
                <Input type="number" placeholder="Ders ücreti" value={newStudentLessonPrice} onChange={(e) => setNewStudentLessonPrice(e.target.value)} />
                <Input type="number" placeholder="Başlangıç bakiye (opsiyonel)" value={newStudentBalance} onChange={(e) => setNewStudentBalance(e.target.value)} />
                <Button onClick={handleAddStudent} className="w-full"><Plus className="mr-2 h-4 w-4" /> Ekle</Button>
            </div>
        </div>

        <div className="border rounded-md">
            {students.length > 0 ? (
                <div className="divide-y">
                    {students.map(student => (
                        <div key={student.id} className="p-4 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
                            <div className="flex-1 flex items-center gap-4">
                                <Users className="h-6 w-6 text-primary flex-shrink-0" />
                                <div>
                                    <p className="font-bold text-lg">{student.name}</p>
                                    <p className="text-sm text-muted-foreground">Ders Ücreti: {formatCurrency(student.lessonPrice)}</p>
                                </div>
                            </div>
                            <div className="flex-none w-full sm:w-32 text-left sm:text-center">
                                <p className="text-sm text-muted-foreground">Bakiye</p>
                                <p className={cn("font-bold text-xl", student.balance < 0 ? 'text-destructive' : 'text-green-600')}>
                                    {formatCurrency(student.balance)}
                                </p>
                            </div>
                            <div className="flex-1 flex flex-col sm:flex-row gap-2 items-center">
                                <Button variant="outline" className="w-full sm:w-auto" onClick={() => handleLessonDone(student)}>Dersi İşle</Button>
                                <div className="flex w-full sm:w-auto gap-2">
                                    <Input
                                        type="number"
                                        placeholder="Tutar"
                                        className="min-w-0"
                                        value={fundsToAdd[student.id] || ''}
                                        onChange={(e) => handleFundsInputChange(student.id, e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddFunds(student)}
                                    />
                                    <Button className="w-full sm:w-auto" onClick={() => handleAddFunds(student)}>Bakiye Ekle</Button>
                                </div>
                            </div>
                            <div className="flex-none">
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
                        </div>
                    ))}
                </div>
            ) : !isLoading && (
                <div className="text-center p-12">
                    <p className="text-muted-foreground mb-4">Henüz öğrenci eklenmemiş.</p>
                    <Button onClick={handleSeedInitialStudents}>
                        Başlangıç Listesini Ekle
                    </Button>
                </div>
            )}
            {isLoading && <p className="text-center p-12 text-muted-foreground">Öğrenciler yükleniyor...</p>}
        </div>
      </CardContent>
    </Card>
  );
}
