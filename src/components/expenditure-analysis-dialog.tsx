'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import type { Category, Transaction } from '@/lib/types';
import { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { getSpendingAnalysis } from '@/app/actions';
import { Loader2, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

type ExpenditureAnalysisDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  transactions: Transaction[];
  categories: Category[];
};

export function ExpenditureAnalysisDialog({
  isOpen,
  onOpenChange,
  transactions,
  categories,
}: ExpenditureAnalysisDialogProps) {
  const [analysis, setAnalysis] = useState<{ analysis: string; suggestions: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryMap = new Map(categories.map((c) => [c.value, c.label]));

  const expenses = useMemo(
    () => transactions.filter((t) => t.type === 'Expense'),
    [transactions]
  );

  const chartData = useMemo(() => {
    const categoryTotals = expenses.reduce<Record<string, number>>((acc, t) => {
      const categoryName = categoryMap.get(t.category) ?? t.category;
      acc[categoryName] = (acc[categoryName] || 0) + t.amount;
      return acc;
    }, {});

    return Object.entries(categoryTotals)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [expenses, categoryMap]);

  const handleGenerateAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const result = await getSpendingAnalysis(transactions);
      setAnalysis(result);
    } catch (e) {
      setError('Failed to generate analysis. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Expenditure Analysis</DialogTitle>
          <DialogDescription>
            Visualize your spending and get AI-powered insights.
          </DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-8 flex-1 min-h-0">
            <div className="flex flex-col gap-4">
                <h3 className="font-semibold text-lg">Spending by Category</h3>
                {chartData.length > 0 ? (
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" tickFormatter={formatCurrency} />
                                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(value: number) => [formatCurrency(value), "Total Spent"]} />
                                <Bar dataKey="total" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : <p className="text-muted-foreground text-sm">No spending data available for this period.</p>
                }
            </div>
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">AI Financial Advisor</h3>
                    <Button onClick={handleGenerateAnalysis} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Generate
                    </Button>
                </div>
                 <div className="border rounded-lg p-4 bg-muted/50 flex-1 overflow-y-auto space-y-4">
                    {isLoading && (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                    {error && <p className="text-destructive">{error}</p>}
                    {analysis ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <h4>Analysis</h4>
                            <p>{analysis.analysis}</p>
                            <h4>Suggestions</h4>
                            <p>{analysis.suggestions}</p>
                        </div>
                    ) : !isLoading && (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <Sparkles className="h-12 w-12 text-muted-foreground" />
                            <p className="text-muted-foreground mt-2">Click 'Generate' to get your personalized spending analysis.</p>
                        </div>
                    )}
                 </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
