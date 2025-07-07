# InvoiceFlow by Firebase Studio

This is a Next.js web application for managing invoices, customers, and products, built with Firebase.

## Getting Started

This project is configured to connect to a live Firebase project on the cloud.

### Step 1: Configure Firebase

1.  Create a new Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/).
2.  In your new project, go to **Build > Firestore Database** and click **Create database**. Start in **production mode**. Choose a location for your data.
3.  Go to **Build > Authentication**, click **Get started**, and enable the **Email/Password** provider.
4.  Return to your Project Overview, and click the **Web icon (`</>`)** to add a new web app to your project.
5.  Give your app a nickname (e.g., "InvoiceFlow Web") and click **Register app**.
6.  You will see a code snippet with a `firebaseConfig` object. This contains the keys you need.
7.  Create a file named `.env` in the root of this project.
8.  Copy the values from the `firebaseConfig` object into your `.env` file, matching the keys shown below:

    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
    NEXT_PUBLIC_FIREBASE_APP_ID=...
    ```

### Step 2: Configure Google AI (Optional)

For AI-powered features like suggestions, you need a Google AI API Key.

1.  Visit [Google AI Studio](https://aistudio.google.com/app/apikey) to get your API key.
2.  Add the key to your `.env` file under `GOOGLE_API_KEY`.

    ```env
    GOOGLE_API_KEY=...
    ```

### Step 3: Run the Application

Once your `.env` file is configured, you can start the development server:

```bash
pnpm install
pnpm run dev
```

The application will now be running at [http://localhost:3000](http://localhost:3000) and connected to your live Firebase project.
