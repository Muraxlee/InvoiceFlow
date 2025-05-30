// This is a placeholder file to maintain compatibility when AI features are disabled
// To restore AI functionality, remove this file and restore the original AI files from ai_backup

// Placeholder for GST suggestion
export interface GstSuggestionOutput {
  gstCategory: string;
  confidence: number;
  rationale: string;
}

export async function suggestGstCategory(description: string): Promise<GstSuggestionOutput> {
  // Return a default suggestion when AI is disabled
  return {
    gstCategory: "GST 18%",
    confidence: 0,
    rationale: "AI features are currently disabled"
  };
}

// Placeholder for sales enhancement
export interface SalesEnhancementInput {
  invoiceData: any[];
  customerData: any[];
  productData: any[];
  totalRevenue: number;
  timeframe: string;
}

export async function getSalesEnhancementSuggestions(
  input: SalesEnhancementInput
): Promise<string[]> {
  // Return a notice that AI features are disabled
  return [
    "AI-powered sales suggestions are temporarily disabled.",
    "To re-enable AI features, restore the original AI files from the ai_backup directory."
  ];
} 