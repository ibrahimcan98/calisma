'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing spending patterns and providing suggestions for improvement.
 *
 * It includes:
 * - `generateSpendingAnalysis`:  The exported function that triggers the spending analysis flow.
 * - `SpendingAnalysisInput`:  The input type definition for the flow, including transaction data.
 * - `SpendingAnalysisOutput`:  The output type definition, providing insights and suggestions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SpendingAnalysisInputSchema = z.object({
  transactions: z.string().describe('Her biri yeni bir satırda olan finansal işlemlerin bir listesini içeren bir metin.'),
});
export type SpendingAnalysisInput = z.infer<typeof SpendingAnalysisInputSchema>;

const SpendingAnalysisOutputSchema = z.object({
  monthlyReport: z.string().describe('Ana eğilimleri, gelir ve giderleri ve en çok harcama yapılan kategorileri vurgulayan kısa bir aylık finansal özet raporu.'),
  savingsScore: z.number().min(0).max(100).describe("0 ile 100 arasında, 100'ün mükemmel olduğu bir tasarruf puanı. Puan, gelir-gider oranına, tasarruf tutarlılığına ve harcama alışkanlıklarına dayanmalıdır."),
  suggestions: z
    .string()
    .describe('Harcama alışkanlıklarını iyileştirmek için özel, eyleme geçirilebilir öneriler.'),
});
export type SpendingAnalysisOutput = z.infer<typeof SpendingAnalysisOutputSchema>;

export async function generateSpendingAnalysis(input: SpendingAnalysisInput): Promise<SpendingAnalysisOutput> {
  return generateSpendingAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'spendingAnalysisPrompt',
  input: {schema: SpendingAnalysisInputSchema},
  output: {schema: SpendingAnalysisOutputSchema},
  prompt: `Sen bir kişisel finans danışmanısın. Aşağıdaki finansal işlem listesini analiz et.

Bu verilere dayanarak kapsamlı bir finansal rapor oluşturacaksın.

1.  **Aylık Finansal Özet Raporu:** Finansal faaliyetin kısa bir özetini oluştur. Ana eğilimleri, gelir ve giderler arasındaki ilişkiyi vurgula ve en çok harcama yapılan kategorileri belirle.
2.  **Tasarruf Skoru:** 0 ile 100 arasında bir "Tasarruf Skoru" hesapla. 100 puan mükemmel finansal sağlığı temsil eder. Bu puanı, gelir-gider oranı, tasarruf tutarlılığı (verilerden anlaşılıyorsa) ve verilerdeki genel harcama alışkanlıkları gibi faktörlere dayandır. Daha yüksek bir gelir-gider oranı daha yüksek bir puanla sonuçlanmalıdır. Bu skor SADECE bir sayı olmalıdır.
3.  **Uygulanabilir Öneriler:** Harcama alışkanlıklarını iyileştirmek ve tasarruf skorunu artırmak için özel, eyleme geçirilebilir öneriler sun.

İşlem verileri aşağıdadır:
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
    return output!;
  }
);
