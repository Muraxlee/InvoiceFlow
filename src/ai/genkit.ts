import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Initialize Genkit.
// This will use the GOOGLE_API_KEY environment variable if available.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
});
