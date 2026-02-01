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
import { Trash2 } from 'lucide-react';
import type { Category, Transaction } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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

  return (
    <div className="w-full overflow-hidden rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px] hidden md:table-cell">
              Kategori
            </TableHead>
            <TableHead>Açıklama</TableHead>
            <TableHead className="text-right">Tutar</TableHead>
            <TableHead className="text-right hidden sm:table-cell">
              Tarih
            </TableHead>
            <TableHead className="w-[50px] text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length > 0 ? (
            transactions.map((transaction) => {
              const category = categoryMap.get(transaction.category);
              const Icon = category?.icon;

              return (
                <TableRow key={transaction.id}>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
                      <span className="font-medium">
                        {category?.label ?? transaction.category}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start md:items-center gap-3">
                      {Icon && (
                        <Icon className="h-8 w-8 text-muted-foreground md:hidden flex-shrink-0 mt-1" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">
                          {transaction.description}
                        </p>
                        <p className="text-sm text-muted-foreground md:hidden">
                          {category?.label ?? transaction.category}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-semibold',
                      transaction.type === 'Income'
                        ? 'text-green-600'
                        : transaction.category === 'savings'
                        ? 'text-blue-600'
                        : 'text-red-600'
                    )}
                  >
                    {transaction.type === 'Income' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    {format(transaction.date, 'd MMM, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteTransaction(transaction.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">
                        İşlemi sil
                      </span>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                Bu dönem için işlem yok.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
