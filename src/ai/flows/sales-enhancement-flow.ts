
'use server';
/**
 * @fileOverview An AI agent to suggest sales enhancement strategies, potentially using business data.
 *
 * - getSalesEnhancementSuggestions - A function that provides sales improvement ideas.
 * - SalesEnhancementInput - The input type for the getSalesEnhancementSuggestions function.
 * - SalesEnhancementOutput - The return type for the getSalesEnhancementSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SalesEnhancementInputSchema = z.object({
  businessContext: z
    .string()
    .optional()
    .describe('A brief description of the business or its current challenges. e.g., "A small retail store selling handmade crafts", "An e-commerce site struggling with cart abandonment".'),
  totalRevenue: z
    .number()
    .optional()
    .describe("The total revenue recorded recently, if available."),
  invoiceCount: z
    .number()
    .optional()
    .describe("The total number of invoices generated recently, if available."),
  customerCount: z
    .number()
    .optional()
    .describe("The total number of customers, if available."),
  productSummary: z
    .string()
    .optional()
    .describe("A brief summary of available products or sales trends. e.g., 'Top products: Widget A, Widget B. Recent increase in Gadget X sales.'"),
});
export type SalesEnhancementInput = z.infer<typeof SalesEnhancementInputSchema>;

const SalesEnhancementOutputSchema = z.object({
  suggestions: z
    .array(z.string().describe("An actionable sales enhancement suggestion."))
    .min(3)
    .max(7)
    .describe('A list of 3-7 actionable suggestions to improve sales.'),
});
export type SalesEnhancementOutput = z.infer<typeof SalesEnhancementOutputSchema>;

export async function getSalesEnhancementSuggestions(
  input: SalesEnhancementInput
): Promise<SalesEnhancementOutput> {
  return salesEnhancementFlow(input);
}

const prompt = ai.definePrompt({
  name: 'salesEnhancementPrompt',
  input: {schema: SalesEnhancementInputSchema},
  output: {schema: SalesEnhancementOutputSchema},
  prompt: `You are an expert sales strategist and business consultant. Your goal is to provide actionable and creative suggestions to help a business increase its sales.

Consider the following context about the business:
{{#if businessContext}}
Business Context: {{{businessContext}}}
{{else}}
The user has not provided specific context. Provide general sales enhancement strategies applicable to many small to medium-sized businesses.
{{/if}}

{{#if totalRevenue}}
Recent Total Revenue: {{totalRevenue}}
{{/if}}
{{#if invoiceCount}}
Recent Invoice Count: {{invoiceCount}}
{{/if}}
{{#if customerCount}}
Total Customer Count: {{customerCount}}
{{/if}}
{{#if productSummary}}
Product Summary/Trends: {{{productSummary}}}
{{/if}}

{{#if (any totalRevenue invoiceCount customerCount productSummary)}}
Based on the provided data, analyze potential areas for improvement.
{{/if}}

Please provide a list of 3-5 concrete, actionable suggestions. For each suggestion, briefly explain the reasoning or potential impact. Focus on strategies that can be implemented relatively easily.
Examples of areas to consider (but not limited to):
- Improving customer engagement based on count and revenue.
- Optimizing pricing or offers, considering product summary.
- Enhancing marketing efforts (digital or offline) targeted by customer/product data.
- Leveraging customer feedback (if patterns emerge from data).
- Introducing loyalty programs if customer count is significant.
- Exploring new sales channels or product bundles.
- Improving the sales process itself based on invoice volume.

Return the suggestions in the specified output format.
`,
});

const salesEnhancementFlow = ai.defineFlow(
  {
    name: 'salesEnhancementFlow',
    inputSchema: SalesEnhancementInputSchema,
    outputSchema: SalesEnhancementOutputSchema,
  },
  async (input: SalesEnhancementInput) => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("AI failed to generate sales suggestions.");
    }
    // Ensure we always return an array, even if the AI fails to produce one.
    // The schema validation for min(3) should ideally handle this from the AI side.
    return { suggestions: output.suggestions || [] };
  }
);
