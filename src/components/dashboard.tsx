'use client';

import { useState, useMemo } from 'react';
import {
  initialTransactions,
  categories as initialCategories,
} from '@/lib/data';
import type { Transaction, Category } from '@/lib/types';
import { Header } from '@/components/header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Circle,
  DollarSign,
  Plus,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TransactionsTable } from './transactions-table';
import { AddTransactionSheet } from './add-transaction-sheet';
import { ExpenditureAnalysisDialog } from './expenditure-analysis-dialog';

export function Dashboard() {
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [categories, setCategories] =
    useState<Category[]>(initialCategories);
  const [isAddSheetOpen, setAddSheetOpen] = useState(false);
  const [isAnalysisDialogOpen, setAnalysisDialogOpen] = useState(false);

  // Show all transactions, sorted by most recent
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactions]);

  const summary = useMemo(() => {
    // Calculate summary based on ALL transactions
    return transactions.reduce(
      (acc, transaction) => {
        if (transaction.type === 'Income') {
          acc.income += transaction.amount;
        } else {
          acc.expenses += transaction.amount;
        }
        acc.balance = acc.income - acc.expenses;
        return acc;
      },
      { income: 0, expenses: 0, balance: 0 }
    );
  }, [transactions]);
  
  const handleAddTransaction = (transaction: Omit<Transaction, 'id'>) => {
    setTransactions((prev) => [
      ...prev,
      { ...transaction, id: crypto.randomUUID() },
    ]);
  };

  const handleAddCategory = (category: Omit<Category, 'icon'>): Category => {
    const newCategory: Category = { ...category, icon: Circle };
    setCategories((prev) => [...prev, newCategory]);
    return newCategory;
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.income)}
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
                {formatCurrency(summary.expenses)}
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
                {formatCurrency(summary.balance)}
              </div>
              <p className="text-xs text-muted-foreground">
                Toplam Gelir - Toplam Gider
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-2">
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

        <TransactionsTable transactions={sortedTransactions} categories={categories} />
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
