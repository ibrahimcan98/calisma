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
} from '@/components/ui/card';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  DollarSign,
  Plus,
  Sparkles,
  CalendarDays,
  History,
  PiggyBank,
  TrendingUp,
  Search,
  Filter,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TransactionsTable } from './transactions-table';
import { AddTransactionSheet } from './add-transaction-sheet';
import { ExpenditureAnalysisDialog } from './expenditure-analysis-dialog';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { startOfMonth, subMonths, differenceInCalendarMonths, isSameWeek, isBefore, isSameDay, format, isToday, isYesterday, startOfToday } from 'date-fns';
import { tr } from 'date-fns/locale';
import { SavingsGoals } from './savings-goals';
import { SubscriptionsPanel } from './subscriptions-panel';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function Dashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [isAddSheetOpen, setAddSheetOpen] = useState(false);
  const [isAnalysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [editableLastMonthSavings, setEditableLastMonthSavings] = useState('0,00');
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Transactions
  const transactionsCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'transactions');
  }, [firestore, user]);
  const { data: rawTransactions } = useCollection<Omit<Transaction, 'id'>>(transactionsCollectionRef);

  // Work Rules
  const workRulesCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'workRules');
  }, [firestore, user]);
  const { data: workRules } = useCollection<WorkRule>(workRulesCollectionRef);

  // Work Logs
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

  // Virtual transactions (Salaries and Subscriptions)
  const virtualTransactions = useMemo(() => {
    if (!isMounted || !user) return [];
    const virtuals: Transaction[] = [];
    const now = new Date();

    const actualWeekly: Record<string, number> = {};
    workLogs.forEach(log => {
      const rule = workRules?.find(r => r.id === log.workRuleId);
      if (rule && rule.hourlyRate) {
        const earnings = (log.totalWorkDurationMinutes / 60) * rule.hourlyRate;
        const d = new Date(log.date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(d.setDate(diff));
        weekStart.setHours(0,0,0,0);
        const key = weekStart.toISOString();
        actualWeekly[key] = (actualWeekly[key] || 0) + earnings;
      }
    });

    Object.entries(actualWeekly).forEach(([weekKey, amount]) => {
      const weekStart = new Date(weekKey);
      const friday = new Date(weekStart);
      friday.setDate(weekStart.getDate() + 4);
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

    subscriptions.forEach(sub => {
      let paymentDate = new Date(sub.startDate);
      let safetyCounter = 0;
      while ((isBefore(paymentDate, now) || isSameDay(paymentDate, now)) && safetyCounter < 24) {
        virtuals.push({
          id: `sub-${sub.id}-${paymentDate.toISOString()}`,
          userId: user.uid,
          amount: sub.amount,
          type: 'Expense',
          category: sub.category || 'entertainment',
          description: `${sub.name} Abonelik Ödemesi`,
          date: new Date(paymentDate),
        });
        paymentDate = sub.frequency === 'monthly' ? new Date(paymentDate.setMonth(paymentDate.getMonth() + 1)) : new Date(paymentDate.setFullYear(paymentDate.getFullYear() + 1));
        safetyCounter++;
      }
    });

    return virtuals;
  }, [workLogs, workRules, subscriptions, isMounted, user]);

  const allTransactionsCombined = useMemo(() => {
    return [...transactions, ...virtualTransactions].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactions, virtualTransactions]);

  const stats = useMemo(() => {
    if (!isMounted) return { balance: 0, totalIncome: 0, totalExpenses: 0, currentMonthExpenses: 0, lastMonthExpenses: 0, lastMonthSavings: 0 };
    const now = new Date();
    const startOfCurr = startOfMonth(now);
    const startOfLast = startOfMonth(subMonths(now, 1));
    
    let ti = 0, te = 0, cme = 0, lme = 0, lmi = 0;
    allTransactionsCombined.forEach(t => {
      if (t.type === 'Income') {
        ti += t.amount;
        if (t.date >= startOfLast && t.date < startOfCurr) lmi += t.amount;
      } else {
        te += t.amount;
        if (t.date >= startOfCurr) cme += t.amount;
        else if (t.date >= startOfLast && t.date < startOfCurr) lme += t.amount;
      }
    });

    return { balance: ti - te, totalIncome: ti, totalExpenses: te, currentMonthExpenses: cme, lastMonthExpenses: lme, lastMonthSavings: lmi - lme };
  }, [allTransactionsCombined, isMounted]);

  // Chart Data: Last 6 months
  const chartData = useMemo(() => {
    if (!isMounted) return [];
    const months = Array.from({ length: 6 }).map((_, i) => startOfMonth(subMonths(new Date(), 5 - i)));
    return months.map(m => {
      const nextM = new Date(m);
      nextM.setMonth(m.getMonth() + 1);
      const filtered = allTransactionsCombined.filter(t => t.date >= m && t.date < nextM);
      const inc = filtered.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
      const exp = filtered.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
      return {
        name: format(m, 'MMM', { locale: tr }),
        gelir: inc,
        gider: exp,
      };
    });
  }, [allTransactionsCombined, isMounted]);

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
    return `${amount < 0 ? '-' : ''}${formatted} €`;
  };

  const filteredTransactions = useMemo(() => {
    return allTransactionsCombined.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
      const matchesTab = activeTab === 'all' || 
                         (activeTab === 'income' && t.type === 'Income') || 
                         (activeTab === 'expense' && t.type === 'Expense');
      return matchesSearch && matchesCategory && matchesTab;
    });
  }, [allTransactionsCombined, searchTerm, categoryFilter, activeTab]);

  const handleCarryOver = () => {
    if (!transactionsCollectionRef || !user) return;
    const amount = parseFloat(editableLastMonthSavings.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;
    addDocumentNonBlocking(transactionsCollectionRef, {
      type: 'Income',
      amount,
      date: new Date(),
      category: 'other',
      description: 'Geçen aydan devir',
      userId: user.uid,
    });
    toast({ title: "Başarılı!", description: "Tutar gelirinize eklendi." });
  };

  if (!isMounted) return null;

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50/50">
      <Header />
      <main className="flex flex-1 flex-col gap-8 p-4 md:p-10 max-w-7xl mx-auto w-full">
        {/* Upper Header with Month Picker and Action */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <div className="flex items-center gap-2 text-slate-500 mt-1">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">{format(new Date(), 'MMMM yyyy', { locale: tr })}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" onClick={() => setAnalysisDialogOpen(true)} className="rounded-xl shadow-sm border-slate-200">
              <Sparkles className="mr-2 h-4 w-4 text-amber-500" />
              AI Analizi
            </Button>
            <Button onClick={() => setAddSheetOpen(true)} className="rounded-xl shadow-md bg-primary hover:bg-primary/90 px-6">
              <Plus className="mr-2 h-4 w-4" />
              Yeni İşlem Ekle
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Main Balance Card */}
          <Card className="md:col-span-12 lg:col-span-5 rounded-3xl border-none shadow-xl bg-white overflow-hidden group">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Net Bakiye</CardTitle>
                <div className="p-2 bg-primary/10 rounded-xl">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                <div className="text-5xl font-black tracking-tighter text-slate-900">
                  {formatCurrency(stats.balance)}
                </div>
                <div className="flex items-center gap-2 mt-2">
                   <div className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-bold">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +2.4%
                  </div>
                  <span className="text-slate-400 text-xs font-medium">geçen aya göre</span>
                </div>
              </div>
              {/* Sparkline */}
              <div className="h-16 w-full mt-6 opacity-40 group-hover:opacity-100 transition-opacity">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="gelir" stroke="#3b82f6" fillOpacity={1} fill="url(#colorBalance)" strokeWidth={2} />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Income & Expense Secondary Cards */}
          <div className="md:col-span-12 lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card className="rounded-3xl border-none shadow-lg bg-white p-6">
               <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-emerald-50 rounded-xl">
                    <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
                  </div>
                  <CardTitle className="text-slate-400 text-xs font-bold uppercase tracking-widest">Toplam Gelir</CardTitle>
               </div>
               <div className="text-3xl font-bold text-slate-900">{formatCurrency(stats.totalIncome)}</div>
               <p className="text-slate-400 text-xs mt-1">Net kazancınız</p>
            </Card>

            <Card className="rounded-3xl border-none shadow-lg bg-white p-6">
               <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-rose-50 rounded-xl">
                    <ArrowDownCircle className="h-5 w-5 text-rose-500" />
                  </div>
                  <CardTitle className="text-slate-400 text-xs font-bold uppercase tracking-widest">Toplam Gider</CardTitle>
               </div>
               <div className="text-3xl font-bold text-rose-600">{formatCurrency(stats.totalExpenses)}</div>
               <p className="text-slate-400 text-xs mt-1">Tüm harcamalar</p>
            </Card>

            <Card className="rounded-3xl border-none shadow-md bg-white p-5 flex items-center justify-between">
              <div>
                <CardTitle className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Beklenen Maaş</CardTitle>
                <div className="text-lg font-bold text-slate-700">{formatCurrency(allTransactionsCombined.find(t => t.category === 'salary' && isSameWeek(t.date, new Date(), { weekStartsOn: 1 }))?.amount || 0)}</div>
              </div>
              <TrendingUp className="h-5 w-5 text-amber-400 opacity-50" />
            </Card>

            <Card className="rounded-3xl border-none shadow-md bg-white p-5 flex items-center justify-between">
              <div>
                <CardTitle className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Bu Ayki Gider</CardTitle>
                <div className="text-lg font-bold text-rose-500">{formatCurrency(stats.currentMonthExpenses)}</div>
              </div>
              <CalendarDays className="h-5 w-5 text-rose-400 opacity-50" />
            </Card>
          </div>
        </div>

        {/* Charts Section */}
        <Card className="rounded-3xl border-none shadow-lg bg-white p-8 overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Gelir & Gider Analizi</h2>
              <p className="text-sm text-slate-400">Son 6 aylık finansal performansınız</p>
            </div>
            <Tabs defaultValue="line" className="w-auto">
              <TabsList className="bg-slate-100 rounded-xl p-1">
                <TabsTrigger value="line" className="rounded-lg text-xs">Çizgi</TabsTrigger>
                <TabsTrigger value="bar" className="rounded-lg text-xs">Sütun</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => `${val}€`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  formatter={(val: number) => [formatCurrency(val), ""]}
                />
                <Line type="monotone" dataKey="gelir" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="gider" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Carry Over & Savings Goals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="rounded-3xl border-none shadow-lg bg-white p-8">
             <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-indigo-50 rounded-2xl">
                  <PiggyBank className="h-6 w-6 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Geçen Aydan Devir</h3>
                  <p className="text-sm text-slate-400">Artan tutarı yeni aya aktarın</p>
                </div>
             </div>
             <div className="flex items-end gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Devredilecek Tutar</label>
                  <Input
                    type="text"
                    value={editableLastMonthSavings}
                    onChange={(e) => setEditableLastMonthSavings(e.target.value)}
                    className="text-2xl font-black bg-transparent border-none p-0 focus-visible:ring-0"
                  />
                </div>
                <Button onClick={handleCarryOver} className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 px-8 h-12">
                  <Plus className="mr-2 h-4 w-4" /> Aktar
                </Button>
             </div>
          </Card>
          <SavingsGoals formatCurrency={formatCurrency} />
        </div>

        {/* Transactions Section */}
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
               <TabsList className="bg-white shadow-sm border border-slate-100 rounded-2xl p-1 w-full md:w-auto h-auto">
                <TabsTrigger value="all" className="rounded-xl px-6 py-2">Tüm İşlemler</TabsTrigger>
                <TabsTrigger value="income" className="rounded-xl px-6 py-2">Gelirler</TabsTrigger>
                <TabsTrigger value="expense" className="rounded-xl px-6 py-2">Giderler</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="İşlem ara..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-xl bg-white border-slate-200 shadow-sm" 
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[140px] rounded-xl bg-white border-slate-200 shadow-sm">
                    <Filter className="h-4 w-4 mr-2 text-slate-400" />
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Tümü</SelectItem>
                    {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="all" className="mt-8">
               <TransactionsTable
                  transactions={filteredTransactions}
                  categories={categories}
                  onDeleteTransaction={(id) => {
                    if (id.startsWith('salary-') || id.startsWith('sub-')) return;
                    if (!user) return;
                    const ref = doc(firestore, 'users', user.uid, 'transactions', id);
                    deleteDocumentNonBlocking(ref);
                  }}
                  formatCurrency={formatCurrency}
                />
            </TabsContent>
            <TabsContent value="income" className="mt-8">
               <TransactionsTable
                  transactions={filteredTransactions}
                  categories={categories}
                  onDeleteTransaction={(id) => {
                    if (id.startsWith('salary-') || id.startsWith('sub-')) return;
                    if (!user) return;
                    const ref = doc(firestore, 'users', user.uid, 'transactions', id);
                    deleteDocumentNonBlocking(ref);
                  }}
                  formatCurrency={formatCurrency}
                />
            </TabsContent>
            <TabsContent value="expense" className="mt-8">
               <TransactionsTable
                  transactions={filteredTransactions}
                  categories={categories}
                  onDeleteTransaction={(id) => {
                    if (id.startsWith('salary-') || id.startsWith('sub-')) return;
                    if (!user) return;
                    const ref = doc(firestore, 'users', user.uid, 'transactions', id);
                    deleteDocumentNonBlocking(ref);
                  }}
                  formatCurrency={formatCurrency}
                />
            </TabsContent>
          </Tabs>
        </div>
        
        <SubscriptionsPanel categories={categories} formatCurrency={formatCurrency} />
      </main>

      <AddTransactionSheet
        isOpen={isAddSheetOpen}
        onOpenChange={setAddSheetOpen}
        categories={categories}
        onAddTransaction={(t) => {
          if (!transactionsCollectionRef || !user) return;
          addDocumentNonBlocking(transactionsCollectionRef, { ...t, userId: user.uid });
        }}
        onAddCategory={(c) => {
          const newCat = { ...c, icon: PiggyBank };
          setCategories(prev => [...prev, newCat]);
          return newCat;
        }}
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
