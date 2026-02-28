'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Calendar } from 'lucide-react';
import type { Category, Transaction } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { tr } from 'date-fns/locale';

type TransactionsTableProps = {
  transactions: Transaction[];
  categories: Category[];
  onDeleteTransaction: (id: string) => void;
  formatCurrency: (amount: number) => string;
};

export function TransactionsTable({
  transactions,
  categories,
  onDeleteTransaction,
  formatCurrency,
}: TransactionsTableProps) {
  const categoryMap = new Map(categories.map((c) => [c.value, c]));

  // Group transactions by date
  const groupedTransactions = transactions.reduce((groups, t) => {
    const dateStr = format(t.date, 'yyyy-MM-dd');
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(t);
    return groups;
  }, {} as Record<string, Transaction[]>);

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));

  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return 'Bugün';
    if (isYesterday(d)) return 'Dün';
    return format(d, 'd MMMM', { locale: tr });
  };

  return (
    <div className="w-full space-y-8">
      {sortedDates.length > 0 ? (
        sortedDates.map(dateStr => (
          <div key={dateStr} className="space-y-3">
             <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                  {getDateLabel(dateStr)}
                </span>
                <div className="h-px flex-1 bg-slate-100" />
             </div>
             
             <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <Table>
                  <TableBody>
                    {groupedTransactions[dateStr].map((transaction) => {
                      const category = categoryMap.get(transaction.category);
                      const Icon = category?.icon;
                      const isAuto = transaction.id.startsWith('salary-') || transaction.id.startsWith('sub-');

                      return (
                        <TableRow key={transaction.id} className="group hover:bg-slate-50/80 transition-all border-slate-50 last:border-0">
                          <TableCell className="w-[64px] py-4 pl-6">
                            <div className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                              transaction.type === 'Income' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"
                            )}>
                              {Icon ? <Icon className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">
                                {transaction.description}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                {category?.label ?? transaction.category}
                                {transaction.subCategory && ` • ${transaction.subCategory}`}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 text-right pr-6">
                            <div className="flex flex-col items-end">
                              <span className={cn(
                                'text-lg font-black tracking-tight',
                                transaction.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'
                              )}>
                                {transaction.type === 'Income' ? '+' : '-'}
                                {formatCurrency(transaction.amount)}
                              </span>
                              {!isAuto && (
                                <button
                                  onClick={() => onDeleteTransaction(transaction.id)}
                                  className="text-[10px] text-slate-300 hover:text-rose-500 font-bold uppercase transition-colors opacity-0 group-hover:opacity-100 mt-1"
                                >
                                  Sil
                                </button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
             </div>
          </div>
        ))
      ) : (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-20 text-center">
            <Calendar className="mx-auto h-12 w-12 text-slate-200 mb-4" />
            <p className="text-slate-400 font-medium">Bu dönem için henüz işlem kaydı bulunmuyor.</p>
        </div>
      )}
    </div>
  );
}
