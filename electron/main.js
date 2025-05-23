
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const isDev = process.env.NODE_ENV !== 'production';
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcrypt'); // Required for password hashing

// Database connection
let db;

// Import database functions from src/lib/database
// Note: Direct import from 'src' might need path adjustments or module aliasing
// For simplicity, we'll assume direct relative path works or adjust later
// This also means database.ts functions need to be compatible with Node.js environment
const dbActions = require('../src/lib/database'); // Adjust path if needed


async function initDatabase() {
  try {
    // Use the initDatabase function from database.ts which now handles path correctly
    db = await dbActions.initDatabase();
    console.log('Electron Main: Database initialized successfully using database.ts logic');
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
    ? 'http://localhost:9002'
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
  await initDatabase();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
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
ipcMain.handle('add-customer', async (event, customer) => dbActions.addCustomer(customer));
ipcMain.handle('delete-customer', async (event, id) => dbActions.deleteCustomer(id));
ipcMain.handle('clear-all-customers', async () => dbActions.clearAllCustomers());

// --- Product Handlers ---
ipcMain.handle('get-all-products', async () => dbActions.getAllProducts());
ipcMain.handle('add-product', async (event, product) => dbActions.addProduct(product));
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
    throw error; // Re-throw to be caught by renderer
  }
});

ipcMain.handle('create-user', async (event, userData) => {
  try {
    // userData should include: username, password, role, name, email, isActive
    return await dbActions.createUser(userData);
  } catch (error) {
    console.error('Error in create-user IPC handler:', error);
    throw error;
  }
});

ipcMain.handle('update-user', async (event, { userId, userData }) => {
  try {
    // userData can be partial: username, password (optional), role, name, email, isActive
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

ipcMain.handle('validate-user-credentials', async (event, { username, password }) => {
  try {
    return await dbActions.validateUserCredentials(username, password);
  } catch (error)
  {
    console.error('Error in validate-user-credentials IPC handler:', error);
    throw error;
  }
});
