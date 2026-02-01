'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Goal } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Plus, Target, Trash2 } from 'lucide-react';
import { AddGoalSheet } from './add-goal-sheet';
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
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';

export function SavingsGoals({ formatCurrency }: { formatCurrency: (amount: number) => string }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isAddSheetOpen, setAddSheetOpen] = useState(false);
  const [fundsToAdd, setFundsToAdd] = useState<Record<string, string>>({});

  const goalsCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'goals');
  }, [firestore, user]);

  const { data: rawGoals } = useCollection<Omit<Goal, 'id'>>(goalsCollectionRef);

  const goals = useMemo(() => {
    if (!rawGoals) return [];
    return rawGoals.map(g => ({
      ...g,
      createdAt: (g.createdAt as any)?.toDate() ?? new Date(),
    })).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }, [rawGoals]);

  const handleAddGoal = (goal: Omit<Goal, 'id' | 'userId' | 'currentAmount' | 'createdAt'>) => {
    if (!goalsCollectionRef || !user) return;
    addDocumentNonBlocking(goalsCollectionRef, {
      ...goal,
      userId: user.uid,
      currentAmount: 0,
      createdAt: serverTimestamp(),
    });
  };

  const handleDeleteGoal = (id: string) => {
    if (!user) return;
    const goalRef = doc(firestore, 'users', user.uid, 'goals', id);
    deleteDocumentNonBlocking(goalRef);
  };
  
  const handleAddFunds = (goal: Goal) => {
    if (!user) return;
    const amountToAdd = parseFloat(fundsToAdd[goal.id] || '0');
    if (isNaN(amountToAdd) || amountToAdd <= 0) {
      toast({
        variant: 'destructive',
        title: 'Geçersiz Tutar',
        description: 'Lütfen pozitif bir sayı girin.',
      });
      return;
    }
    
    const newCurrentAmount = goal.currentAmount + amountToAdd;
    
    const goalRef = doc(firestore, 'users', user.uid, 'goals', goal.id);
    updateDocumentNonBlocking(goalRef, { currentAmount: newCurrentAmount });

    const transactionsCollectionRef = collection(firestore, 'users', user.uid, 'transactions');
    addDocumentNonBlocking(transactionsCollectionRef, {
        amount: amountToAdd,
        category: 'savings',
        date: new Date(),
        description: `Hedefe para eklendi: ${goal.name}`,
        type: 'Expense',
        userId: user.uid,
    });

    toast({
      title: 'Para Eklendi!',
      description: `${formatCurrency(amountToAdd)} başarıyla ${goal.name} hedefinize eklendi.`,
    });
    
    setFundsToAdd(prev => ({...prev, [goal.id]: ''}));
  };

  const handleFundsInputChange = (goalId: string, value: string) => {
    setFundsToAdd(prev => ({...prev, [goalId]: value}));
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Birikim Hedefleri</h2>
        <Button onClick={() => setAddSheetOpen(true)}>
          <Plus className="mr-2" /> Yeni Hedef Ekle
        </Button>
      </div>

      {goals.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            return (
              <Card key={goal.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{goal.name}</span>
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
                            Bu işlem geri alınamaz. "{goal.name}" hedefiniz kalıcı olarak silinecektir.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>İptal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteGoal(goal.id)} className="bg-destructive hover:bg-destructive/90">Sil</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardTitle>
                  <CardDescription>{formatCurrency(goal.targetAmount)} hedefine ulaş</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-grow">
                  <div>
                    <div className="flex justify-between mb-1 text-sm font-medium">
                      <span className="text-muted-foreground">Birikim</span>
                      <span>{formatCurrency(goal.currentAmount)}</span>
                    </div>
                    <Progress value={progress} />
                    <p className="text-xs text-muted-foreground mt-1 text-right">{progress.toFixed(0)}% tamamlandı</p>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                    <Input 
                        type="number"
                        placeholder="Para ekle"
                        value={fundsToAdd[goal.id] || ''}
                        onChange={(e) => handleFundsInputChange(goal.id, e.target.value)}
                    />
                    <Button onClick={() => handleAddFunds(goal)}>Ekle</Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
            <Target className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Henüz hedef yok</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
                İlk birikim hedefinizi ekleyerek başlayın.
            </p>
            <Button onClick={() => setAddSheetOpen(true)}>
                <Plus className="mr-2" /> Hedef Ekle
            </Button>
        </div>
      )}

      <AddGoalSheet 
        isOpen={isAddSheetOpen}
        onOpenChange={setAddSheetOpen}
        onAddGoal={handleAddGoal}
      />
    </div>
  );
}
