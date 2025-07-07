
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

### Step 2: Deploy Security Rules

To ensure your application can read and write data from Firestore, you must deploy the security rules included in this project.

**Option A: Using the Firebase CLI (Recommended)**

1.  **Install the Firebase CLI** if you haven't already:
    ```bash
    npm install -g firebase-tools
    ```
2.  **Log in to Firebase**:
    ```bash
    firebase login
    ```
3.  **Deploy the Rules**: From your project's root directory, run the following command:
    ```bash
    firebase deploy --only firestore:rules
    ```

**Option B: Using the Firebase Console**

1.  Open the `firestore.rules` file in this project.
2.  Copy its entire contents.
3.  Go to the [Firebase Console](https://console.firebase.google.com/), select your project.
4.  Navigate to **Build > Firestore Database > Rules** tab.
5.  Paste the contents into the rules editor and click **Publish**.

### Step 3: Configure Google AI (Optional)

For AI-powered features like suggestions, you need a Google AI API Key.

1.  Visit [Google AI Studio](https://aistudio.google.com/app/apikey) to get your API key.
2.  Add the key to your `.env` file under `GOOGLE_API_KEY`.

    ```env
    GOOGLE_API_KEY=...
    ```

### Step 4: Create a User and Run the App

1.  In the Firebase Console, go to **Build > Authentication > Users** and click **Add user**. Create your first user account.
2.  Once your `.env` file is configured and security rules are deployed, you can start the development server:
    ```bash
    pnpm install
    pnpm run dev
    ```
3.  Log in with the user account you just created.

The application will now be running at [http://localhost:3000](http://localhost:3000) and connected to your live Firebase project.

### Step 5: Load Sample Data (Optional)

To get started with some sample data, navigate to **Settings > Data** in the application and click the "Load Sample Data" button.
