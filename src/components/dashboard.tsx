'use client';

import { useState, useMemo } from 'react';
import { categories as initialCategories } from '@/lib/data';
import type { Transaction, Category } from '@/lib/types';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TransactionsTable } from './transactions-table';
import { AddTransactionSheet } from './add-transaction-sheet';
import { ExpenditureAnalysisDialog } from './expenditure-analysis-dialog';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { startOfMonth, subMonths, differenceInCalendarMonths } from 'date-fns';
import { SavingsGoals } from './savings-goals';
import { SubscriptionsPanel } from './subscriptions-panel';
import { useToast } from '@/hooks/use-toast';


export function Dashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [categories, setCategories] =
    useState<Category[]>(initialCategories);
  const [isAddSheetOpen, setAddSheetOpen] = useState(false);
  const [isAnalysisDialogOpen, setAnalysisDialogOpen] = useState(false);

  const transactionsCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'transactions');
  }, [firestore, user]);

  const { data: rawTransactions } = useCollection<Omit<Transaction, 'id'>>(transactionsCollectionRef);

  const transactions = useMemo(() => {
    if (!rawTransactions) return [];
    return rawTransactions.map(t => ({
      ...t,
      // Firestore returns timestamps, convert them to JS Date objects
      date: (t.date as any).toDate(),
    }));
  }, [rawTransactions]);

  // Show all transactions, sorted by most recent
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactions]);

  const stats = useMemo(() => {
    if (transactions.length === 0) {
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
    
    let totalIncome = 0;
    let totalExpenses = 0;
    let currentMonthExpenses = 0;
    let lastMonthExpenses = 0;
    let lastMonthIncome = 0;

    for (const t of transactions) {
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

    const oldestTransaction = transactions.length > 0 ? transactions.reduce((earliest, t) => earliest.date > t.date ? t : earliest) : {date: new Date()};
    const totalMonths = differenceInCalendarMonths(now, oldestTransaction.date) + 1;
    const averageMonthlyExpense = totalExpenses / (totalMonths > 0 ? totalMonths : 1);
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
  }, [transactions]);
  
  const hasCarryOverForCurrentMonth = useMemo(() => {
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    return transactions.some(t => 
        t.description === 'Geçen aydan devir' && 
        t.date >= startOfCurrentMonth
    );
  }, [transactions]);

  const handleAddTransaction = (transaction: Omit<Transaction, 'id'>) => {
    if (!transactionsCollectionRef) return;
    addDocumentNonBlocking(transactionsCollectionRef, { ...transaction, date: transaction.date });
  };

  const handleDeleteTransaction = (id: string) => {
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
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const handleCarryOver = () => {
    if (!transactionsCollectionRef || !user) return;

    if (stats.lastMonthSavings <= 0) {
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
      amount: stats.lastMonthSavings,
      date: new Date(),
      category: 'other',
      description: 'Geçen aydan devir',
      userId: user.uid,
    };
    
    addDocumentNonBlocking(transactionsCollectionRef, carryOverTransaction);

    toast({
      title: "Başarılı!",
      description: `${formatCurrency(stats.lastMonthSavings)} tutarı gelirinize eklendi.`,
    });
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalIncome)}
              </div>
              <p className="text-xs text-muted-foreground">
                Tüm zamanlar
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Toplam Gider
              </CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.totalExpenses)}
              </div>
              <p className="text-xs text-muted-foreground">
                Tüm zamanlar
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bakiye</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.balance)}
              </div>
              <p className="text-xs text-muted-foreground">
                Toplam Gelir - Toplam Gider
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bu Ayki Gider</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.currentMonthExpenses)}
              </div>
              <p className="text-xs text-muted-foreground">
                Bu ayki toplam harcama
              </p>
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
              <p className="text-xs text-muted-foreground">
                Geçen ayki toplam harcama
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ortalama Aylık Gider</CardTitle>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.averageMonthlyExpense)}
              </div>
              <p className="text-xs text-muted-foreground">
                Hesaplanan aylık ortalama
              </p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Geçen Aydan Artan</CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.lastMonthSavings)}
              </div>
              <p className="text-xs text-muted-foreground">
                Geçen ayki gelir - gider farkı
              </p>
            </CardContent>
            {stats.lastMonthSavings > 0 && !hasCarryOverForCurrentMonth && (
              <CardFooter>
                  <Button className="w-full" onClick={handleCarryOver}>
                      <Plus className="mr-2 h-4 w-4" /> Gelire Ekle
                  </Button>
              </CardFooter>
            )}
          </Card>
        </div>
        
        <div className="pt-8">
            <SavingsGoals />
        </div>

        <div className="pt-8">
            <SubscriptionsPanel categories={categories} />
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
          transactions={sortedTransactions}
          categories={categories}
          onDeleteTransaction={handleDeleteTransaction}
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
        transactions={sortedTransactions}
        categories={categories}
      />
    </div>
  );
}
