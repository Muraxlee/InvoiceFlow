
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const isDev = process.env.NODE_ENV !== 'production';
// Note: sqlite3 and open are not directly used here anymore if all DB logic is in database.ts
// const sqlite3 = require('sqlite3');
// const { open } = require('sqlite');
// const bcrypt = require('bcrypt'); // bcrypt is used within database.ts

// Database connection - managed by database.ts
// let db; // db instance is now managed within database.ts

// Import database functions from src/lib/database
const dbActions = require('../src/lib/database'); // Adjust path if needed

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;


async function initDatabase() {
  try {
    // Use the initDatabase function from database.ts which now handles path correctly
    // This just ensures the DB is initialized on app start if needed by Electron directly,
    // though most direct DB calls will come from IPC handlers calling dbActions.
    await dbActions.initDatabase();
    console.log('Electron Main: Database initialization check complete via database.ts logic');
  } catch (error) {
    console.error('Electron Main: Database initialization error:', error);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  mainWindow.setTitle('InvoiceFlow - Invoice Management System');
  const startUrl = isDev
    ? 'http://localhost:9002' // Port from package.json dev script
    : url.format({
        pathname: path.join(__dirname, '../out/index.html'),
        protocol: 'file:',
        slashes: true
      });
  mainWindow.loadURL(startUrl);
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await initDatabase(); // Ensure database is ready
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  await dbActions.closeDatabase(); // Close DB connection when app closes
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- Invoice IPC Handlers ---
ipcMain.handle('get-all-invoices', async () => dbActions.getAllInvoices());
ipcMain.handle('get-invoice-by-id', async (event, id) => dbActions.getInvoiceById(id));
ipcMain.handle('save-invoice', async (event, invoice) => dbActions.saveInvoice(invoice));
ipcMain.handle('delete-invoice', async (event, id) => dbActions.deleteInvoice(id));

// --- Company Info Handlers ---
ipcMain.handle('get-company-info', async () => dbActions.getCompanyInfo());
ipcMain.handle('save-company-info', async (event, company) => dbActions.saveCompanyInfo(company));

// --- Customer Handlers ---
ipcMain.handle('get-all-customers', async () => dbActions.getAllCustomers());
ipcMain.handle('add-customer', async (event, customer) => {
  try {
    return await dbActions.addCustomer(customer);
  } catch (error) {
    console.error('Error in add-customer IPC handler:', error);
    throw error; // Re-throw to be caught by renderer
  }
});
ipcMain.handle('delete-customer', async (event, id) => dbActions.deleteCustomer(id));
ipcMain.handle('clear-all-customers', async () => dbActions.clearAllCustomers());

// --- Product Handlers ---
ipcMain.handle('get-all-products', async () => dbActions.getAllProducts());
ipcMain.handle('add-product', async (event, product) => {
   try {
    return await dbActions.addProduct(product);
  } catch (error) {
    console.error('Error in add-product IPC handler:', error);
    throw error; // Re-throw to be caught by renderer
  }
});
ipcMain.handle('delete-product', async (event, id) => dbActions.deleteProduct(id));
ipcMain.handle('clear-all-products', async () => dbActions.clearAllProducts());

// --- General Data Clear Handler ---
ipcMain.handle('clear-all-data', async () => dbActions.clearAllData());

// --- User Management Handlers ---
ipcMain.handle('get-all-users', async () => {
  try {
    return await dbActions.getAllUsers();
  } catch (error) {
    console.error('Error in get-all-users IPC handler:', error);
    throw error; 
  }
});

ipcMain.handle('create-user', async (event, userData) => {
  try {
    return await dbActions.createUser(userData);
  } catch (error) {
    console.error('Error in create-user IPC handler:', error);
    throw error;
  }
});

ipcMain.handle('update-user', async (event, { userId, userData }) => {
  try {
    return await dbActions.updateUser(userId, userData);
  } catch (error) {
    console.error('Error in update-user IPC handler:', error);
    throw error;
  }
});

ipcMain.handle('delete-user', async (event, userId) => {
  try {
    return await dbActions.deleteUser(userId);
  } catch (error) {
    console.error('Error in delete-user IPC handler:', error);
    throw error;
  }
});

ipcMain.handle('validate-user-credentials', async (event, { username, password_NOT_Hashed_Yet }) => {
  try {
    // The password_NOT_Hashed_Yet naming implies it's plain text from form.
    // The validateUserCredentials function in database.ts should handle comparison with hashed password.
    return await dbActions.validateUserCredentials(username, password_NOT_Hashed_Yet);
  } catch (error)
  {
    console.error('Error in validate-user-credentials IPC handler:', error);
    throw error;
  }
});

// --- Database Backup/Restore IPC Handlers ---
ipcMain.handle('get-database-path', async () => {
  try {
    // dbActions.getDbPath() should be callable and return the Electron userData path for the DB
    return dbActions.getDbPath();
  } catch (error) {
    console.error('Error getting database path:', error);
    throw error;
  }
});

ipcMain.handle('backup-database', async () => {
  const currentDbPath = dbActions.getDbPath();
  const defaultFileName = `invoiceflow_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
  
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Backup Database',
    defaultPath: path.join(app.getPath('documents'), defaultFileName),
    filters: [{ name: 'Database Files', extensions: ['db'] }]
  });

  if (filePath) {
    try {
      await dbActions.closeDatabase(); // Ensure DB is closed before copying
      fs.copyFileSync(currentDbPath, filePath);
      await dbActions.initDatabase(); // Re-initialize DB connection
      return { success: true, path: filePath };
    } catch (error) {
      console.error('Database backup failed:', error);
      await dbActions.initDatabase(); // Attempt to re-initialize if closing failed before copy
      throw error;
    }
  }
  return { success: false, message: 'Backup cancelled by user.' };
});

ipcMain.handle('restore-database', async (event, sourceFilePath) => {
  const targetDbPath = dbActions.getDbPath();
  try {
    await dbActions.closeDatabase(); // Ensure DB is closed before replacing
    fs.copyFileSync(sourceFilePath, targetDbPath);
    await dbActions.initDatabase(); // Re-initialize with the new DB file
    return { success: true };
  } catch (error) {
    console.error('Database restore failed:', error);
    await dbActions.initDatabase(); // Attempt to re-initialize if closing failed before copy
    throw error;
  }
});
