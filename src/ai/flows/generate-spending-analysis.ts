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

const TransactionSchema = z.object({
  date: z.string().describe('The date of the transaction (YYYY-MM-DD).'),
  category: z.string().describe('The category of the transaction.'),
  subCategory: z.string().optional().describe('The optional sub-category of the transaction.'),
  amount: z.number().describe('The amount of the transaction.'),
});

const SpendingAnalysisInputSchema = z.object({
  transactions: z.array(TransactionSchema).describe('An array of transactions to analyze.'),
});
export type SpendingAnalysisInput = z.infer<typeof SpendingAnalysisInputSchema>;

const SpendingAnalysisOutputSchema = z.object({
  analysis: z.string().describe('A detailed analysis of spending patterns by category over time.'),
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
  prompt: `You are a personal finance advisor. Analyze the following spending data and provide a detailed analysis of spending patterns by category over time. Also, provide specific, actionable suggestions for improving spending habits.

Spending Data:
{{#each transactions}}
  Date: {{date}}, Category: {{category}}, Sub-Category: {{subCategory}}, Amount: {{amount}}
{{/each}}`,
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
