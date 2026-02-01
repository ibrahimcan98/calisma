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
  transactions: z.string().describe('A string containing a list of financial transactions, with each transaction on a new line.'),
});
export type SpendingAnalysisInput = z.infer<typeof SpendingAnalysisInputSchema>;

const SpendingAnalysisOutputSchema = z.object({
  monthlyReport: z.string().describe('A concise monthly financial summary report, highlighting key trends, income vs. expenses, and top spending categories.'),
  savingsScore: z.number().min(0).max(100).describe('A savings score from 0 to 100, where 100 is excellent. The score should be based on the income-to-expense ratio, saving consistency, and spending habits.'),
  suggestions: z
    .string()
    .describe('Specific, actionable suggestions for improving spending habits.'),
});
export type SpendingAnalysisOutput = z.infer<typeof SpendingAnalysisOutputSchema>;

export async function generateSpendingAnalysis(input: SpendingAnalysisInput): Promise<SpendingAnalysisOutput> {
  return generateSpendingAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'spendingAnalysisPrompt',
  input: {schema: SpendingAnalysisInputSchema},
  output: {schema: SpendingAnalysisOutputSchema},
  prompt: `You are a personal finance advisor. Analyze the following list of financial transactions.

Based on this data, you will generate a comprehensive financial report.

1.  **Monthly Financial Summary Report:** Create a concise summary of the financial activity. Highlight key trends, the relationship between income and expenses, and identify the top spending categories.
2.  **Savings Score:** Calculate a "Savings Score" on a scale of 0 to 100. A score of 100 represents excellent financial health. Base this score on factors like the income-to-expense ratio, consistency in savings (if identifiable), and overall spending habits reflected in the data. A higher ratio of income to expenses should result in a higher score.
3.  **Actionable Suggestions:** Provide specific, actionable suggestions for improving spending habits and increasing the savings score.

Here is the transaction data:
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
