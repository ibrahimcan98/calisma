
'use server';

/**
 * @fileOverview Finansal analiz için Genkit akışı.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SpendingAnalysisInputSchema = z.object({
  transactions: z.string().describe('Finansal işlemlerin listesi.'),
});
export type SpendingAnalysisInput = z.infer<typeof SpendingAnalysisInputSchema>;

const SpendingAnalysisOutputSchema = z.object({
  monthlyReport: z.string().describe('Kısa finansal özet raporu.'),
  savingsScore: z.number().min(0).max(100).describe("0-100 arası tasarruf puanı."),
  suggestions: z.string().describe('Eyleme geçirilebilir öneriler.'),
});
export type SpendingAnalysisOutput = z.infer<typeof SpendingAnalysisOutputSchema>;

export async function generateSpendingAnalysis(input: SpendingAnalysisInput): Promise<SpendingAnalysisOutput> {
  return generateSpendingAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'spendingAnalysisPrompt',
  input: {schema: SpendingAnalysisInputSchema},
  output: {schema: SpendingAnalysisOutputSchema},
  prompt: `Sen uzman bir kişisel finans danışmanısın. Aşağıdaki işlem listesini analiz et ve Türkçe bir rapor sun.

1.  **Aylık Rapor:** Harcama trendlerini ve en büyük gider kalemlerini özetle.
2.  **Tasarruf Skoru:** Gelir/gider dengesine göre 0-100 arası bir puan ver. Sadece sayı olsun.
3.  **Öneriler:** Tasarrufu artırmak için 3 somut öneri ver.

İşlemler:
{{{transactions}}}`,
});

const generateSpendingAnalysisFlow = ai.defineFlow(
  {
    name: 'generateSpendingAnalysisFlow',
    inputSchema: SpendingAnalysisInputSchema,
    outputSchema: SpendingAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) throw new Error('AI yanit üretemedi.');
    return output;
  }
);
