import {genkit} from 'genkit/ai';
import {googleAI} from 'genkit/plugins';

// Initialize Genkit.
// This will use the GOOGLE_API_KEY environment variable if available.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
