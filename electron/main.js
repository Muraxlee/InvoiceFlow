
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const isDev = process.env.NODE_ENV !== 'production';

const dbActions = require('../src/lib/database-electron'); 

let mainWindow;

async function initDatabase() {
  try {
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

app.on('window-all-closed', async () => {
  await dbActions.closeDatabase(); 
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
    throw error; 
  }
});
ipcMain.handle('update-customer', async (event, { customerId, customerData }) => {
  try {
    return await dbActions.updateCustomer(customerId, customerData);
  } catch (error) {
    console.error('Error in update-customer IPC handler:', error);
    throw error;
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
    throw error; 
  }
});
ipcMain.handle('update-product', async (event, { productId, productData }) => {
  try {
    return await dbActions.updateProduct(productId, productData);
  } catch (error) {
    console.error('Error in update-product IPC handler:', error);
    throw error;
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

ipcMain.handle('get-user-by-username', async (event, username) => {
  try {
    return await dbActions.getUserByUsername(username);
  } catch (error) {
    console.error('Error in get-user-by-username IPC handler:', error);
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
    filters: [{ name: 'Database Files', extensions: ['db', 'sqlite', 'sqlite3'] }]
  });

  if (filePath) {
    try {
      await dbActions.closeDatabase(); 
      fs.copyFileSync(currentDbPath, filePath);
      await dbActions.initDatabase(); 
      return { success: true, path: filePath };
    } catch (error) {
      console.error('Database backup failed:', error);
      await dbActions.initDatabase(); 
      throw error;
    }
  }
  return { success: false, message: 'Backup cancelled by user.' };
});

ipcMain.handle('initiate-database-restore', async () => {
  const targetDbPath = dbActions.getDbPath();
  
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Database Backup to Restore',
    filters: [{ name: 'Database Files', extensions: ['db', 'sqlite', 'sqlite3'] }],
    properties: ['openFile']
  });

  if (canceled || !filePaths || filePaths.length === 0) {
    return { success: false, message: 'Restore cancelled by user.' };
  }

  const sourceFilePath = filePaths[0];

  try {
    await dbActions.closeDatabase(); 
    fs.copyFileSync(sourceFilePath, targetDbPath);
    await dbActions.initDatabase(); 
    return { success: true };
  } catch (error) {
    console.error('Database restore failed:', error);
    await dbActions.initDatabase(); 
    throw error;
  }
});
