# AI Functionality (Temporarily Disabled)

This directory contains backup copies of the AI-related files that have been temporarily disabled in the application.

## How to Restore AI Functionality

1. Delete or rename the placeholder files in the `src/ai` directory:
   - `src/ai/placeholder.ts`
   - `src/ai/genkit.ts` (modified version)
   - `src/ai/dev.ts` (modified version)

2. Copy all files from this `ai_backup` directory back to the `src/ai` directory:
   ```
   xcopy src\ai_backup\* src\ai\ /E /I /H
   ```

3. Make sure you have the required API keys set up in your `.env` file:
   ```
   GOOGLE_API_KEY=your_api_key_here
   ```

4. Restart the application to re-enable AI functionality.

## Affected Features

The following features are affected by disabling AI:

1. GST category suggestions in invoice creation
2. Sales enhancement suggestions in the reports page

These features now display placeholder messages instead of AI-generated content. 