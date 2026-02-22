'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Cake, Gift } from 'lucide-react';
import type { Birthday } from '@/lib/types';
import { useUser, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { AddBirthdaySheet } from './add-birthday-sheet';

type BirthdayManagerProps = {
  birthdays: Birthday[];
};

export function BirthdayManager({ birthdays }: BirthdayManagerProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const handleDelete = (id: string) => {
    if (!user) return;
    const ref = doc(firestore, 'users', user.uid, 'birthdays', id);
    deleteDocumentNonBlocking(ref);
    toast({ title: "Kayıt Silindi", description: "Doğum günü kaydı kaldırıldı." });
  };

  const sortedBirthdays = [...birthdays].sort((a, b) => {
      const aMonth = a.birthDate.getMonth();
      const bMonth = b.birthDate.getMonth();
      if (aMonth !== bMonth) return aMonth - bMonth;
      return a.birthDate.getDate() - b.birthDate.getDate();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Doğum Günü Hatırlatmaları</h2>
          <p className="text-sm text-muted-foreground">Sevdiklerinizin doğum günlerini her yıl hatırla.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Doğum Günü Ekle
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedBirthdays.map(b => (
          <Card key={b.id} className="relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2">
                <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
            </div>
            <CardHeader className="flex flex-row items-center gap-4">
               <div className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center">
                  <Cake className="h-5 w-5 text-pink-600" />
               </div>
               <div>
                  <CardTitle className="text-lg">{b.personName}</CardTitle>
                  <CardDescription>{format(b.birthDate, 'd MMMM', { locale: tr })}</CardDescription>
               </div>
            </CardHeader>
            <CardContent>
                {b.notes && <p className="text-xs text-muted-foreground italic">"{b.notes}"</p>}
            </CardContent>
          </Card>
        ))}

        {sortedBirthdays.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg">
                <Gift className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-muted-foreground">Henüz kayıtlı doğum günü yok.</p>
            </div>
        )}
      </div>

      <AddBirthdaySheet 
        isOpen={isAddOpen} 
        onOpenChange={setIsAddOpen} 
      />
    </div>
  );
}
