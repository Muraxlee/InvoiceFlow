
// This is an autogenerated file from Firebase Studio.
'use server';
/**
 * @fileOverview An AI agent to suggest Tax categories (HSN/SAC codes) for invoice items.
 *
 * - suggestGstCategory - A function that suggests the Tax category.
 * - GstSuggestionInput - The input type for the suggestGstCategory function.
 * - GstSuggestionOutput - The return type for the suggestGstCategory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GstSuggestionInputSchema = z.object({
  itemDescription: z
    .string()
    .describe('The description of the invoice item.'),
});
export type GstSuggestionInput = z.infer<typeof GstSuggestionInputSchema>;

const GstSuggestionOutputSchema = z.object({
  gstCategory: z // Retaining 'gstCategory' as the field name for minimal disruption, but it now means Tax Category / HSN / SAC
    .string()
    .describe('The suggested Tax Category (e.g., HSN code or SAC code) for the item.'),
  confidence: z
    .number()
    .describe(
      'A confidence score between 0 and 1 indicating the accuracy of the suggestion.'
    ),
});
export type GstSuggestionOutput = z.infer<typeof GstSuggestionOutputSchema>;

export async function suggestGstCategory(
  input: GstSuggestionInput
): Promise<GstSuggestionOutput> {
  return suggestGstCategoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'gstSuggestionPrompt',
  input: {schema: GstSuggestionInputSchema},
  output: {schema: GstSuggestionOutputSchema},
  prompt: `You are an AI assistant specialized in suggesting appropriate Tax Categories (like HSN codes for goods or SAC codes for services) for invoice items based on Indian tax regulations.

  Given the item description, provide the most appropriate Tax Category/HSN/SAC code and a confidence score (0 to 1) for your suggestion.

  Item Description: {{{itemDescription}}}
  `,
});

const suggestGstCategoryFlow = ai.defineFlow(
  {
    name: 'suggestGstCategoryFlow',
    inputSchema: GstSuggestionInputSchema,
    outputSchema: GstSuggestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
