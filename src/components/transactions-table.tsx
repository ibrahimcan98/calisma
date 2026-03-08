'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { Calendar, ChevronDown } from 'lucide-react';
import type { Category, Transaction } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isSameMonth, startOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

  // 1. Group transactions by Month (Key: YYYY-MM)
  const groupedByMonth = transactions.reduce((months, t) => {
    const monthKey = format(t.date, 'yyyy-MM');
    if (!months[monthKey]) months[monthKey] = [];
    months[monthKey].push(t);
    return months;
  }, {} as Record<string, Transaction[]>);

  const sortedMonthKeys = Object.keys(groupedByMonth).sort((a, b) => b.localeCompare(a));
  const currentMonthKey = format(new Date(), 'yyyy-MM');

  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return 'Bugün';
    if (isYesterday(d)) return 'Dün';
    return format(d, 'd MMMM', { locale: tr });
  };

  return (
    <div className="w-full">
      {sortedMonthKeys.length > 0 ? (
        <Accordion type="multiple" defaultValue={[currentMonthKey]} className="space-y-6">
          {sortedMonthKeys.map((monthKey) => {
            const monthTransactions = groupedByMonth[monthKey];
            const monthDate = new Date(`${monthKey}-01`);
            const monthLabel = format(monthDate, 'MMMM yyyy', { locale: tr });

            // 2. Inside each month, group by day for the existing clean design
            const dayGroups = monthTransactions.reduce((days, t) => {
              const dayStr = format(t.date, 'yyyy-MM-dd');
              if (!days[dayStr]) days[dayStr] = [];
              days[dayStr].push(t);
              return days;
            }, {} as Record<string, Transaction[]>);

            const sortedDayKeys = Object.keys(dayGroups).sort((a, b) => b.localeCompare(a));

            return (
              <AccordionItem key={monthKey} value={monthKey} className="border-none">
                <AccordionTrigger className="hover:no-underline py-2 px-4 bg-slate-100/50 rounded-2xl group">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                      {monthLabel}
                    </span>
                    <span className="text-xs text-slate-400 font-medium ml-2">
                      ({monthTransactions.length} işlem)
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-8">
                  {sortedDayKeys.map(dateStr => (
                    <div key={dateStr} className="space-y-3 px-1">
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {getDateLabel(dateStr)}
                        </span>
                        <div className="h-px flex-1 bg-slate-100" />
                      </div>
                      
                      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <Table>
                          <TableBody>
                            {dayGroups[dateStr].map((transaction) => {
                              const category = categoryMap.get(transaction.category);
                              const Icon = category?.icon;
                              const isAuto = transaction.id.startsWith('sub-');

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
                  ))}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-20 text-center">
            <Calendar className="mx-auto h-12 w-12 text-slate-200 mb-4" />
            <p className="text-slate-400 font-medium">Bu dönem için henüz işlem kaydı bulunmuyor.</p>
        </div>
      )}
    </div>
  );
}