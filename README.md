# InvoiceFlow by Firebase Studio

This is a Next.js web application for managing invoices, customers, and products, built with Firebase.

## Getting Started

This project is configured to connect to a live Firebase project on the cloud.

### Step 1: Configure Firebase

1.  Create a new Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/).
2.  Enable the **Firestore Database** and **Authentication** (with Email/Password provider) services.
3.  In your Firebase project settings, go to the **General** tab.
4.  Under "Your apps", create a new **Web app**.
5.  Copy the `firebaseConfig` object values.
6.  Create a file named `.env` in the root of this project.
7.  Paste the configuration values into the `.env` file, matching the keys provided in this file.

### Step 2: Configure Google AI (Optional)

For AI-powered features like suggestions, you need a Google AI API Key.

1.  Visit [Google AI Studio](https://aistudio.google.com/app/apikey) to get your API key.
2.  Add the key to your `.env` file under `GOOGLE_API_KEY`.

### Step 3: Run the Application

Once your `.env` file is configured, you can start the development server:

```bash
pnpm install
pnpm run dev
```

The application will now be running at [http://localhost:3000](http://localhost:3000) and connected to your live Firebase project.
