'use server';

import {
  generateSpendingAnalysis,
  type SpendingAnalysisInput,
} from '@/ai/flows/generate-spending-analysis';
import type { Transaction } from '@/lib/types';

export async function getSpendingAnalysis(transactions: Transaction[]) {
  if (transactions.length === 0) {
    return {
        analysis: "No transaction data available for this period.",
        suggestions: "Add some transactions to get started with your spending analysis."
    };
  }

  const analysisInput: SpendingAnalysisInput = {
    transactions: transactions.map((t) => ({
      date: t.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
      category: t.category,
      subCategory: t.subCategory,
      amount: t.amount,
    })),
  };

  try {
    const result = await generateSpendingAnalysis(analysisInput);
    return result;
  } catch (error) {
    console.error('Error generating spending analysis:', error);
    throw new Error('Failed to generate AI analysis. Please try again later.');
  }
}
