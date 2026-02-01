'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Subscription, Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Repeat, Trash2, CalendarIcon } from 'lucide-react';
import { AddSubscriptionSheet } from './add-subscription-sheet';
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
} from "@/components/ui/alert-dialog"
import { format, addMonths, addYears } from 'date-fns';

type SubscriptionsPanelProps = {
    categories: Category[];
    formatCurrency: (amount: number) => string;
};

export function SubscriptionsPanel({ categories, formatCurrency }: SubscriptionsPanelProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const [isAddSheetOpen, setAddSheetOpen] = useState(false);

  const subscriptionsCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'subscriptions');
  }, [firestore, user]);

  const { data: rawSubscriptions } = useCollection<Omit<Subscription, 'id'>>(subscriptionsCollectionRef);

  const subscriptions = useMemo(() => {
    if (!rawSubscriptions) return [];
    return rawSubscriptions.map(s => ({
      ...s,
      startDate: (s.startDate as any)?.toDate() ?? new Date(),
    })).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [rawSubscriptions]);

  const handleAddSubscription = (subscription: Omit<Subscription, 'id' | 'userId'>) => {
    if (!subscriptionsCollectionRef || !user) return;
    addDocumentNonBlocking(subscriptionsCollectionRef, {
      ...subscription,
      userId: user.uid,
    });
  };

  const handleDeleteSubscription = (id: string) => {
    if (!user) return;
    const subscriptionRef = doc(firestore, 'users', user.uid, 'subscriptions', id);
    deleteDocumentNonBlocking(subscriptionRef);
  };

  const calculateNextPaymentDate = (startDate: Date, frequency: 'monthly' | 'yearly'): Date => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); 
    let nextDate = new Date(startDate.getTime());

    while (nextDate < now) {
        if (frequency === 'monthly') {
            nextDate = addMonths(nextDate, 1);
        } else { // yearly
            nextDate = addYears(nextDate, 1);
        }
    }
    return nextDate;
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Abonelikler</h2>
        <Button onClick={() => setAddSheetOpen(true)}>
          <Plus className="mr-2" /> Yeni Abonelik Ekle
        </Button>
      </div>

      {subscriptions.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {subscriptions.map((sub) => {
            const nextPaymentDate = calculateNextPaymentDate(sub.startDate, sub.frequency);
            return (
              <Card key={sub.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{sub.name}</span>
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
                            Bu işlem geri alınamaz. "{sub.name}" aboneliğiniz kalıcı olarak silinecektir.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>İptal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteSubscription(sub.id)} className="bg-destructive hover:bg-destructive/90">Sil</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardTitle>
                  <CardDescription>{formatCurrency(sub.amount)} / {sub.frequency === 'monthly' ? 'ay' : 'yıl'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-grow">
                    <div className="flex items-center text-sm text-muted-foreground">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        <span>Sonraki ödeme: {format(nextPaymentDate, 'd MMMM yyyy')}</span>
                    </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
            <Repeat className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Henüz abonelik yok</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
                Tekrarlayan ödemelerinizi ekleyerek takibe başlayın.
            </p>
            <Button onClick={() => setAddSheetOpen(true)}>
                <Plus className="mr-2" /> Abonelik Ekle
            </Button>
        </div>
      )}

      <AddSubscriptionSheet 
        isOpen={isAddSheetOpen}
        onOpenChange={setAddSheetOpen}
        onAddSubscription={handleAddSubscription}
        categories={categories}
      />
    </div>
  );
}
