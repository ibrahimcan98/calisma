
'use server';

import {
  generateSpendingAnalysis,
  type SpendingAnalysisInput,
  type SpendingAnalysisOutput,
} from '@/ai/flows/generate-spending-analysis';
import type { Transaction } from '@/lib/types';

export async function getSpendingAnalysis(transactions: any[]): Promise<SpendingAnalysisOutput> {
  if (!transactions || transactions.length === 0) {
    return {
        monthlyReport: "Bu dönem için analiz edilecek işlem verisi bulunmuyor.",
        savingsScore: 0,
        suggestions: "Harcama analizinize başlamak için birkaç işlem ekleyin."
    };
  }

  // Convert transactions to a human-readable string format
  // Handling serialization: Date objects from client may arrive as strings
  const transactionsString = transactions
    .map(t => {
      const subCategory = t.subCategory ? `, Alt Kategori: ${t.subCategory}` : '';
      
      let dateStr = 'Bilinmeyen Tarih';
      try {
        const dateObj = new Date(t.date);
        if (!isNaN(dateObj.getTime())) {
          dateStr = dateObj.toISOString().split('T')[0];
        }
      } catch (e) {
        // Fallback
      }
      
      return `- Tarih: ${dateStr}, Tür: ${t.type}, Tutar: ${t.amount}€, Kategori: ${t.category}${subCategory}, Açıklama: "${t.description}"`;
    })
    .join('\n');

  const analysisInput: SpendingAnalysisInput = {
    transactions: transactionsString,
  };

  try {
    const result = await generateSpendingAnalysis(analysisInput);
    return result;
  } catch (error: any) {
    console.error('AI Analiz Hatası:', error);
    // Return a structured error fallback instead of throwing to prevent blank screens
    return {
      monthlyReport: "Şu anda analiz raporu oluşturulamıyor. Lütfen daha sonra tekrar deneyin.",
      savingsScore: 0,
      suggestions: "Analiz servisi geçici olarak kullanım dışı. İşlemleriniz kaydedildi, daha sonra tekrar analiz alabilirsiniz."
    };
  }
}
