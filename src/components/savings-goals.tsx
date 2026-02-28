'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Goal } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Plus, Target, Trash2, Rocket, Award, Star } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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
    const amountStr = (fundsToAdd[goal.id] || '').replace(',', '.');
    const amountToAdd = parseFloat(amountStr);
    if (isNaN(amountToAdd) || amountToAdd <= 0) return;
    
    const newCurrentAmount = goal.currentAmount + amountToAdd;
    const goalRef = doc(firestore, 'users', user.uid, 'goals', goal.id);
    updateDocumentNonBlocking(goalRef, { currentAmount: newCurrentAmount });

    const transactionsCollectionRef = collection(firestore, 'users', user.uid, 'transactions');
    addDocumentNonBlocking(transactionsCollectionRef, {
        amount: amountToAdd,
        category: 'savings',
        date: new Date(),
        description: `Hedefe ekleme: ${goal.name}`,
        type: 'Expense',
        userId: user.uid,
    });

    toast({ title: 'Para Eklendi!', description: `${formatCurrency(amountToAdd)} hedefinize işlendi.` });
    setFundsToAdd(prev => ({...prev, [goal.id]: ''}));
  };

  return (
    <Card className="rounded-3xl border-none shadow-lg bg-white p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-amber-50 rounded-2xl">
             <Target className="h-6 w-6 text-amber-500" />
           </div>
           <div>
             <h3 className="text-lg font-bold text-slate-900">Birikim Hedefleri</h3>
             <p className="text-sm text-slate-400">Geleceğinizi bugün inşa edin</p>
           </div>
        </div>
        <Button size="icon" variant="ghost" onClick={() => setAddSheetOpen(true)} className="rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="space-y-6">
        {goals.map((goal) => {
          const progress = Math.min(100, goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0);
          const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
          const isFinished = progress >= 100;

          return (
            <div key={goal.id} className="p-6 rounded-3xl bg-slate-50 border border-slate-100 relative group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", isFinished ? "bg-emerald-100 text-emerald-600" : "bg-white text-amber-500 shadow-sm")}>
                    {isFinished ? <Award className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 leading-tight">{goal.name}</h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatCurrency(goal.targetAmount)} Hedef</span>
                  </div>
                </div>
                
                 <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-300 hover:text-rose-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-3xl border-none">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hedefi Sil?</AlertDialogTitle>
                      <AlertDialogDescription>"{goal.name}" hedefiniz ve tüm ilerlemeniz silinecek.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">İptal</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteGoal(goal.id)} className="rounded-xl bg-rose-500 hover:bg-rose-600">Sil</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                   <span className="text-2xl font-black tracking-tighter text-slate-900">{formatCurrency(goal.currentAmount)}</span>
                   <span className="text-xs font-bold text-slate-400">{isFinished ? "Tamamlandı!" : `${formatCurrency(remaining)} kaldı`}</span>
                </div>
                <div className="relative pt-1">
                  <Progress value={progress} className="h-3 rounded-full bg-slate-200" />
                  {isFinished && <Star className="absolute -right-2 -top-2 h-5 w-5 text-amber-400 fill-amber-400 animate-pulse" />}
                </div>
              </div>

              {!isFinished && (
                <div className="flex gap-2 mt-6">
                  <Input 
                    placeholder="Tutar"
                    value={fundsToAdd[goal.id] || ''}
                    onChange={(e) => setFundsToAdd(prev => ({...prev, [goal.id]: e.target.value}))}
                    className="rounded-xl bg-white border-slate-200 text-xs font-bold h-9"
                  />
                  <Button onClick={() => handleAddFunds(goal)} className="rounded-xl bg-primary h-9 px-4 text-xs font-bold shadow-sm">
                    Para Ekle
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {goals.length === 0 && (
          <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-3xl">
             <Target className="mx-auto h-8 w-8 text-slate-200 mb-2" />
             <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Henüz hedef yok</p>
          </div>
        )}
      </div>

      <AddGoalSheet isOpen={isAddSheetOpen} onOpenChange={setAddSheetOpen} onAddGoal={handleAddGoal} />
    </Card>
  );
}
