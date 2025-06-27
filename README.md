# InvoiceFlow by Firebase Studio

This is a Next.js web application for managing invoices, customers, and products, built with Firebase.

## Getting Started

This project uses a local Firebase Emulator Suite for development. The emulators and the web application must be run in separate terminals.

### Step 1: Start the Firebase Emulators

In your terminal, run the following command to start the local database and authentication services:

```bash
pnpm run emulators:start
```

**For Windows users:** You can simply double-click the `start-emulators.bat` file in the project root.

Leave this terminal window running. It will handle all the local Firebase services.

### Step 2: Start the Web Application

Open a **new, separate terminal window** and run the development server:

```bash
pnpm run dev
```

The application will now be running and connected to your local emulators.

### Accessing the App & Emulators

- **Web Application**: [http://localhost:3000](http://localhost:3000)
- **Firebase Emulator UI**: [http://127.0.0.1:4154](http://127.0.0.1:4154) (You can view your local database contents here)
