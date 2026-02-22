'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Subscription, Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Repeat, Trash2, CalendarIcon, Wallet } from 'lucide-react';
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
import { Badge } from './ui/badge';

type SubscriptionsPanelProps = {
    categories: Category[];
    formatCurrency: (amount: number) => string;
};

export function SubscriptionsPanel({ categories, formatCurrency }: SubscriptionsPanelProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  const totalMonthlyCost = useMemo(() => {
    return subscriptions.reduce((acc, sub) => {
      if (sub.frequency === 'monthly') {
        return acc + sub.amount;
      } else {
        return acc + (sub.amount / 12);
      }
    }, 0);
  }, [subscriptions]);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Abonelikler</h2>
          <p className="text-sm text-muted-foreground italic">Tüm düzenli ödemelerinizin takibi</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Card className="bg-primary/5 border-primary/20 px-4 py-2 flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none">Toplam Aylık Gider</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(totalMonthlyCost)}</p>
            </div>
          </Card>
          <Button onClick={() => setAddSheetOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Yeni Abonelik
          </Button>
        </div>
      </div>

      {subscriptions.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {subscriptions.map((sub) => {
            const nextPaymentDate = isMounted ? calculateNextPaymentDate(sub.startDate, sub.frequency) : null;
            return (
              <Card key={sub.id} className="flex flex-col border-l-4 border-l-primary">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{sub.name}</span>
                     <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
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
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-lg font-semibold text-foreground">
                      {formatCurrency(sub.amount)}
                    </CardDescription>
                    <Badge variant="secondary" className="capitalize">
                      {sub.frequency === 'monthly' ? 'aylık' : 'yıllık'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-grow">
                    <div className="flex items-center text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {isMounted && nextPaymentDate ? (
                          <span>Sonraki ödeme: <span className="font-medium text-foreground">{format(nextPaymentDate, 'd MMMM yyyy')}</span></span>
                        ) : (
                          <span>Sonraki ödeme: Hesaplanıyor...</span>
                        )}
                    </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
            <Repeat className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-lg font-semibold">Henüz abonelik yok</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
                Tekrarlayan ödemelerinizi ekleyerek aylık toplam harcamanızı görün.
            </p>
            <Button onClick={() => setAddSheetOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Abonelik Ekle
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
