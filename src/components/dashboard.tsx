
'use client';

import { useState, useMemo, useEffect } from 'react';
import { categories as initialCategories } from '@/lib/data';
import type { Transaction, Category, WorkRule, WorkLog, Subscription } from '@/lib/types';
import { Header } from '@/components/header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Circle,
  DollarSign,
  Plus,
  Sparkles,
  CalendarDays,
  History,
  Scale,
  PiggyBank,
  Briefcase,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TransactionsTable } from './transactions-table';
import { AddTransactionSheet } from './add-transaction-sheet';
import { ExpenditureAnalysisDialog } from './expenditure-analysis-dialog';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { startOfMonth, subMonths, differenceInCalendarMonths, isSameWeek, startOfWeek, endOfWeek, addDays, addMonths, addYears, isAfter, isBefore, isSameDay } from 'date-fns';
import { SavingsGoals } from './savings-goals';
import { SubscriptionsPanel } from './subscriptions-panel';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';


export function Dashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [categories, setCategories] =
    useState<Category[]>(initialCategories);
  const [isAddSheetOpen, setAddSheetOpen] = useState(false);
  const [isAnalysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [editableLastMonthSavings, setEditableLastMonthSavings] = useState('0.00');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Transactions
  const transactionsCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'transactions');
  }, [firestore, user]);
  const { data: rawTransactions } = useCollection<Omit<Transaction, 'id'>>(transactionsCollectionRef);

  // Work Rules (for hourly rates)
  const workRulesCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'workRules');
  }, [firestore, user]);
  const { data: workRules } = useCollection<WorkRule>(workRulesCollectionRef);

  // Work Logs (for earnings)
  const workLogsCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'workLogs');
  }, [firestore, user]);
  const { data: rawWorkLogs } = useCollection<Omit<WorkLog, 'id'>>(workLogsCollectionRef);

  // Subscriptions
  const subscriptionsCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'subscriptions');
  }, [firestore, user]);
  const { data: rawSubscriptions } = useCollection<Omit<Subscription, 'id'>>(subscriptionsCollectionRef);

  const transactions = useMemo(() => {
    if (!rawTransactions) return [];
    return rawTransactions.map(t => ({
      ...t,
      date: (t.date as any).toDate ? (t.date as any).toDate() : new Date(t.date),
    }));
  }, [rawTransactions]);

  const workLogs = useMemo(() => {
    if (!rawWorkLogs) return [];
    return rawWorkLogs.map(l => ({
      ...l,
      date: (l.date as any).toDate ? (l.date as any).toDate() : new Date(l.date),
    }));
  }, [rawWorkLogs]);

  const subscriptions = useMemo(() => {
    if (!rawSubscriptions) return [];
    return rawSubscriptions.map(s => ({
      ...s,
      startDate: (s.startDate as any).toDate ? (s.startDate as any).toDate() : new Date(s.startDate),
    }));
  }, [rawSubscriptions]);

  // Generate virtual transactions for Friday Salaries and Subscription Payments
  const virtualTransactions = useMemo(() => {
    if (!isMounted || !user) return [];
    const virtuals: Transaction[] = [];
    const now = new Date();

    // 1. Weekly Friday Salary
    // Group earnings by week (Monday to Sunday)
    const weeklyEarnings: Record<string, number> = {};
    workLogs.forEach(log => {
      const rule = workRules?.find(r => r.id === log.workRuleId);
      if (rule && rule.hourlyRate) {
        const earnings = (log.totalWorkDurationMinutes / 60) * rule.hourlyRate;
        const weekStart = startOfWeek(log.date, { weekStartsOn: 1 });
        const weekKey = weekStart.toISOString();
        weeklyEarnings[weekKey] = (weeklyEarnings[weekKey] || 0) + earnings;
      }
    });

    Object.entries(weeklyEarnings).forEach(([weekKey, amount]) => {
      const weekStart = new Date(weekKey);
      const friday = addDays(weekStart, 4); // Friday of that week
      
      // Only show salary if it's already occurred
      if (isBefore(friday, now) || isSameDay(friday, now)) {
        virtuals.push({
          id: `salary-${weekKey}`,
          userId: user.uid,
          amount,
          type: 'Income',
          category: 'salary',
          description: 'Haftalık Maaş Ödemesi',
          date: friday,
        });
      }
    });

    // 2. Subscription Payments
    subscriptions.forEach(sub => {
      let paymentDate = new Date(sub.startDate);
      // Ensure we don't calculate thousands of years if date is wrong
      let safetyCounter = 0;
      
      while ((isBefore(paymentDate, now) || isSameDay(paymentDate, now)) && safetyCounter < 100) {
        virtuals.push({
          id: `sub-${sub.id}-${paymentDate.toISOString()}`,
          userId: user.uid,
          amount: sub.amount,
          type: 'Expense',
          category: sub.category || 'entertainment',
          description: `${sub.name} Abonelik Ödemesi`,
          date: new Date(paymentDate),
        });

        if (sub.frequency === 'monthly') {
          paymentDate = addMonths(paymentDate, 1);
        } else {
          paymentDate = addYears(paymentDate, 1);
        }
        safetyCounter++;
      }
    });

    return virtuals;
  }, [workLogs, workRules, subscriptions, isMounted, user]);

  // Combined financial stats
  const stats = useMemo(() => {
    if (!isMounted) {
      return {
        balance: 0,
        totalIncome: 0,
        totalExpenses: 0,
        currentMonthExpenses: 0,
        lastMonthExpenses: 0,
        averageMonthlyExpense: 0,
        lastMonthSavings: 0,
      };
    }

    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    const startOfLastMonth = startOfMonth(subMonths(now, 1));
    
    // Merge real and virtual transactions for calculation
    const allItems = [...transactions, ...virtualTransactions];
    
    let totalIncome = 0;
    let totalExpenses = 0;
    let currentMonthExpenses = 0;
    let lastMonthExpenses = 0;
    let lastMonthIncome = 0;

    for (const t of allItems) {
        if (t.type === 'Income') {
            totalIncome += t.amount;
            if (t.date >= startOfLastMonth && t.date < startOfCurrentMonth) {
                lastMonthIncome += t.amount;
            }
        } else { // Expense
            totalExpenses += t.amount;
            if (t.date >= startOfCurrentMonth) {
                currentMonthExpenses += t.amount;
            } else if (t.date >= startOfLastMonth && t.date < startOfCurrentMonth) {
                lastMonthExpenses += t.amount;
            }
        }
    }

    const oldestTransaction = allItems.length > 0 ? allItems.reduce((earliest, t) => earliest.date > t.date ? t : earliest) : {date: new Date()};
    const totalMonths = Math.max(1, differenceInCalendarMonths(now, oldestTransaction.date) + 1);
    const averageMonthlyExpense = totalExpenses / totalMonths;
    const lastMonthSavings = lastMonthIncome - lastMonthExpenses;

    return {
      balance: totalIncome - totalExpenses,
      totalIncome,
      totalExpenses,
      currentMonthExpenses,
      lastMonthExpenses,
      averageMonthlyExpense,
      lastMonthSavings,
    };
  }, [transactions, virtualTransactions, isMounted]);
  
  const allTransactionsCombined = useMemo(() => {
    return [...transactions, ...virtualTransactions].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactions, virtualTransactions]);

  useEffect(() => {
    if (isMounted) {
      setEditableLastMonthSavings(stats.lastMonthSavings.toFixed(2));
    }
  }, [stats.lastMonthSavings, isMounted]);

  const hasCarryOverForCurrentMonth = useMemo(() => {
    if (!isMounted) return false;
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    return transactions.some(t => 
        t.description === 'Geçen aydan devir' && 
        t.date >= startOfCurrentMonth
    );
  }, [transactions, isMounted]);

  const handleAddTransaction = (transaction: Omit<Transaction, 'id' | 'userId'>) => {
    if (!transactionsCollectionRef || !user) return;
    
    const finalData = {
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date,
      category: transaction.category,
      subCategory: transaction.subCategory || "",
      description: transaction.description,
      userId: user.uid
    };
    
    addDocumentNonBlocking(transactionsCollectionRef, finalData);
  };

  const handleDeleteTransaction = (id: string) => {
    if (id.startsWith('salary-') || id.startsWith('sub-')) {
        toast({
            title: "Otomatik İşlem",
            description: "Bu işlem mesai kayıtları veya aboneliklerden otomatik üretilmiştir. Silmek için ilgili kaydı düzenleyin.",
        });
        return;
    }
    if (!user || !firestore) return;
    const transactionRef = doc(firestore, 'users', user.uid, 'transactions', id);
    deleteDocumentNonBlocking(transactionRef);
  };

  const handleAddCategory = (category: Omit<Category, 'icon'>): Category => {
    const newCategory: Category = { ...category, icon: Circle };
    setCategories((prev) => [...prev, newCategory]);
    return newCategory;
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const handleCarryOver = () => {
    if (!transactionsCollectionRef || !user) return;
    
    const amountToAdd = parseFloat(editableLastMonthSavings);

    if (isNaN(amountToAdd) || amountToAdd <= 0) {
      toast({
        variant: "destructive",
        title: "İşlem Başarısız",
        description: "Yalnızca pozitif tutarlar gelire eklenebilir.",
      });
      return;
    }

    if (hasCarryOverForCurrentMonth) {
        toast({
            variant: 'default',
            title: 'Bilgi',
            description: 'Geçen aydan kalan tutar bu ay için zaten gelire eklenmiş.',
        });
        return;
    }

    const carryOverTransaction = {
      type: 'Income' as 'Income',
      amount: amountToAdd,
      date: new Date(),
      category: 'other',
      description: 'Geçen aydan devir',
      userId: user.uid,
    };
    
    addDocumentNonBlocking(transactionsCollectionRef, carryOverTransaction);

    toast({
      title: "Başarılı!",
      description: `${formatCurrency(amountToAdd)} tutarı gelirinize eklendi.`,
    });
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-green-50/50 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalIncome)}
              </div>
              <p className="text-xs text-muted-foreground">
                Manuel Gelir + Maaş Kazancı
              </p>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Gider</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.totalExpenses)}
              </div>
              <p className="text-xs text-muted-foreground">
                Abonelikler dahil toplam harcama
              </p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50/50 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Bakiye</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {formatCurrency(stats.balance)}
              </div>
              <p className="text-xs text-muted-foreground">
                Tüm gelir/gider sonrası kalan
              </p>
            </CardContent>
          </Card>

          <Card className="border-accent/40 bg-accent/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Haftalık Beklenen Maaş</CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">
                {formatCurrency(allTransactionsCombined.find(t => t.category === 'salary' && isSameWeek(t.date, new Date(), { weekStartsOn: 1 }))?.amount || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Bu Cuma yatması beklenen tutar
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bu Ayki Gider</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.currentMonthExpenses)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Geçen Ayki Gider</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.lastMonthExpenses)}
              </div>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Geçen Aydan Artan</CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
               <Input
                  type="number"
                  value={editableLastMonthSavings}
                  onChange={(e) => setEditableLastMonthSavings(e.target.value)}
                  className="text-2xl font-bold h-auto p-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                />
            </CardContent>
            {parseFloat(editableLastMonthSavings) > 0 && !hasCarryOverForCurrentMonth && (
              <CardFooter>
                  <Button className="w-full" onClick={handleCarryOver}>
                      <Plus className="mr-2 h-4 w-4" /> Gelire Ekle
                  </Button>
              </CardFooter>
            )}
          </Card>
        </div>
        
        <div className="pt-8">
            <SavingsGoals formatCurrency={formatCurrency} />
        </div>

        <div className="pt-8">
            <SubscriptionsPanel categories={categories} formatCurrency={formatCurrency} />
        </div>

        <div className="flex items-center gap-2 mt-8">
          <h2 className="text-2xl font-bold tracking-tight flex-1">Son İşlemler</h2>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={() => setAnalysisDialogOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              AI Analizi
            </Button>
            <Button onClick={() => setAddSheetOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              İşlem Ekle
            </Button>
          </div>
        </div>

        <TransactionsTable
          transactions={allTransactionsCombined}
          categories={categories}
          onDeleteTransaction={handleDeleteTransaction}
          formatCurrency={formatCurrency}
        />
      </main>

      <AddTransactionSheet
        isOpen={isAddSheetOpen}
        onOpenChange={setAddSheetOpen}
        categories={categories}
        onAddTransaction={handleAddTransaction}
        onAddCategory={handleAddCategory}
      />
      <ExpenditureAnalysisDialog
        isOpen={isAnalysisDialogOpen}
        onOpenChange={setAnalysisDialogOpen}
        transactions={allTransactionsCombined}
        categories={categories}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
