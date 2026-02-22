'use server';

import {
  generateSpendingAnalysis,
  type SpendingAnalysisInput,
  type SpendingAnalysisOutput,
} from '@/ai/flows/generate-spending-analysis';
import type { Transaction } from '@/lib/types';

export async function getSpendingAnalysis(transactions: Transaction[]): Promise<SpendingAnalysisOutput> {
  if (!transactions || transactions.length === 0) {
    return {
        monthlyReport: "Bu dönem için analiz edilecek işlem verisi bulunmuyor.",
        savingsScore: 0,
        suggestions: "Harcama analizinize başlamak için birkaç işlem ekleyin."
    };
  }

  // Convert transactions to a human-readable string format
  const transactionsString = transactions
    .map(t => {
      const subCategory = t.subCategory ? `, Sub-category: ${t.subCategory}` : '';
      
      // Dates are serialized as strings when passed to Server Actions
      let dateStr = 'Bilinmeyen Tarih';
      try {
        const dateObj = new Date(t.date);
        if (!isNaN(dateObj.getTime())) {
          dateStr = dateObj.toISOString().split('T')[0];
        }
      } catch (e) {
        // Fallback to unknown
      }
      
      return `- Tarih: ${dateStr}, Tür: ${t.type}, Tutar: ${t.amount}, Kategori: ${t.category}${subCategory}, Açıklama: "${t.description}"`;
    })
    .join('\n');


  const analysisInput: SpendingAnalysisInput = {
    transactions: transactionsString,
  };

  try {
    const result = await generateSpendingAnalysis(analysisInput);
    return result;
  } catch (error) {
    console.error('Error generating spending analysis:', error);
    throw new Error('Failed to generate AI analysis. Please try again later.');
  }
}
