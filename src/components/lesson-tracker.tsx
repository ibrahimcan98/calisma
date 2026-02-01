'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Student } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

const initialStudents = [
  'Ata, Mila, Batu',
  'Ozan, Leo',
  'Ozan, Selen',
  'Beliz, Leyla',
  'Lila',
  'Ali, Lyla',
];

export function LessonTracker() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newStudentName, setNewStudentName] = useState('');

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

  const handleAddStudent = () => {
    if (!studentsCollectionRef || !user || !newStudentName.trim()) return;

    addDocumentNonBlocking(studentsCollectionRef, {
      name: newStudentName.trim(),
      paymentStatus: 'Unpaid',
      userId: user.uid,
      createdAt: serverTimestamp(),
    });
    setNewStudentName('');
    toast({ title: "Öğrenci Eklendi", description: `${newStudentName} listeye eklendi.`});
  };

  const handleDeleteStudent = (id: string) => {
    if (!user) return;
    const studentRef = doc(firestore, 'users', user.uid, 'students', id);
    deleteDocumentNonBlocking(studentRef);
    toast({ variant: 'destructive', title: "Öğrenci Silindi", description: "Seçilen öğrenci listeden kaldırıldı."});
  };
  
  const handleToggleStatus = (student: Student) => {
    if (!user) return;
    const studentRef = doc(firestore, 'users', user.uid, 'students', student.id);
    const newStatus = student.paymentStatus === 'Paid' ? 'Unpaid' : 'Paid';
    updateDocumentNonBlocking(studentRef, { paymentStatus: newStatus });
    toast({ title: "Durum Güncellendi", description: `${student.name} durumu '${newStatus}' olarak değiştirildi.`});
  };

  const handleSeedInitialStudents = () => {
    if (!studentsCollectionRef || !user) return;
    initialStudents.forEach(name => {
      addDocumentNonBlocking(studentsCollectionRef, {
        name: name,
        paymentStatus: 'Unpaid',
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
    });
    toast({ title: "Başlangıç Listesi Eklendi", description: "Öğrenciler başarıyla eklendi."});
  };

  const handleResetAllToUnpaid = () => {
     if (!user) return;
     students.forEach(student => {
        if (student.paymentStatus === 'Paid') {
            const studentRef = doc(firestore, 'users', user.uid, 'students', student.id);
            updateDocumentNonBlocking(studentRef, { paymentStatus: 'Unpaid' });
        }
     });
     toast({ title: "Liste Yenilendi", description: "Tüm ödemeler 'Ödenmedi' olarak ayarlandı."});
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ders Takibi</CardTitle>
        <CardDescription>Öğrencilerin ders ve ödeme durumlarını buradan yönetebilirsiniz.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Input 
            placeholder="Yeni öğrenci adı veya grubu"
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
          />
          <Button onClick={handleAddStudent}><Plus className="mr-2 h-4 w-4" /> Ekle</Button>
        </div>

        <div className="border rounded-md">
            {students.length > 0 ? (
                <div className="divide-y">
                    {students.map(student => (
                        <div key={student.id} className="flex items-center p-4 gap-4">
                            <Users className="h-5 w-5 text-muted-foreground" />
                            <p className="flex-1 font-medium">{student.name}</p>
                            <Badge variant={student.paymentStatus === 'Paid' ? 'secondary' : 'destructive'}>
                                {student.paymentStatus === 'Paid' ? 'Ödendi' : 'Ödenmedi'}
                            </Badge>
                            <Button variant="outline" size="sm" onClick={() => handleToggleStatus(student)}>
                                {student.paymentStatus === 'Paid' ? 'Ödenmedi İşaretle' : 'Ödendi İşaretle'}
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
        {students.length > 0 && (
             <div className="flex justify-end">
                <Button variant="outline" onClick={handleResetAllToUnpaid}>Yeni Hafta (Tümünü Ödenmedi Yap)</Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
