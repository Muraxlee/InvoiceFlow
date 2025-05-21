
'use server';
/**
 * @fileOverview An AI agent to suggest sales enhancement strategies.
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

Consider the following context about the business (if provided):
{{#if businessContext}}
Business Context: {{{businessContext}}}
{{else}}
The user has not provided specific context. Provide general sales enhancement strategies applicable to many small to medium-sized businesses.
{{/if}}

Please provide a list of 3-5 concrete, actionable suggestions. For each suggestion, briefly explain the reasoning or potential impact. Focus on strategies that can be implemented relatively easily.
Examples of areas to consider (but not limited to):
- Improving customer engagement
- Optimizing pricing or offers
- Enhancing marketing efforts (digital or offline)
- Leveraging customer feedback
- Introducing loyalty programs
- Exploring new sales channels
- Improving the sales process itself

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
