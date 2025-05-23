const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const isDev = process.env.NODE_ENV !== 'production';
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

// Keep a global reference of the window object
let mainWindow;

// Database connection
let db;

async function initDatabase() {
  try {
    const dbPath = path.join(app.getPath('userData'), 'invoiceflow.db');
    console.log('Database path:', dbPath);
    
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    // Create tables if they don't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        invoiceNumber TEXT UNIQUE,
        customerName TEXT,
        customerEmail TEXT,
        customerAddress TEXT,
        invoiceDate TEXT,
        dueDate TEXT,
        notes TEXT,
        termsAndConditions TEXT,
        invoiceImage TEXT,
        status TEXT,
        amount REAL
      );
      
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoiceId TEXT,
        description TEXT,
        quantity REAL,
        price REAL,
        gstCategory TEXT,
        FOREIGN KEY (invoiceId) REFERENCES invoices (id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS company (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        email TEXT,
        gstin TEXT,
        bank_name TEXT,
        bank_account TEXT,
        bank_ifsc TEXT
      );
    `);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Set window title
  mainWindow.setTitle('InvoiceFlow - Invoice Management System');

  // Load the app
  const startUrl = isDev
    ? 'http://localhost:9002' // Development server
    : url.format({ // Production build
        pathname: path.join(__dirname, '../out/index.html'),
        protocol: 'file:',
        slashes: true
      });

  mainWindow.loadURL(startUrl);

  // Open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // When window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// When Electron has finished initializing
app.whenReady().then(async () => {
  await initDatabase();
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle IPC calls for database operations
ipcMain.handle('get-all-invoices', async () => {
  try {
    const invoices = await db.all('SELECT * FROM invoices ORDER BY invoiceDate DESC');
    for (const invoice of invoices) {
      const items = await db.all('SELECT * FROM invoice_items WHERE invoiceId = ?', [invoice.id]);
      invoice.items = items;
      invoice.invoiceDate = new Date(invoice.invoiceDate);
      invoice.dueDate = new Date(invoice.dueDate);
    }
    return invoices;
  } catch (error) {
    console.error('Error getting invoices:', error);
    throw error;
  }
});

ipcMain.handle('get-invoice-by-id', async (event, id) => {
  try {
    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!invoice) return null;
    
    invoice.items = await db.all('SELECT * FROM invoice_items WHERE invoiceId = ?', [id]);
    invoice.invoiceDate = new Date(invoice.invoiceDate);
    invoice.dueDate = new Date(invoice.dueDate);
    return invoice;
  } catch (error) {
    console.error('Error getting invoice:', error);
    throw error;
  }
});

ipcMain.handle('save-invoice', async (event, invoice) => {
  try {
    await db.run('BEGIN TRANSACTION');
    
    await db.run(`
      INSERT OR REPLACE INTO invoices (
        id, invoiceNumber, customerName, customerEmail, customerAddress, 
        invoiceDate, dueDate, notes, termsAndConditions, invoiceImage, status, amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invoice.id,
      invoice.invoiceNumber,
      invoice.customerName,
      invoice.customerEmail || '',
      invoice.customerAddress || '',
      invoice.invoiceDate,
      invoice.dueDate,
      invoice.notes || '',
      invoice.termsAndConditions || '',
      invoice.invoiceImage || '',
      invoice.status,
      invoice.amount
    ]);
    
    await db.run('DELETE FROM invoice_items WHERE invoiceId = ?', [invoice.id]);
    
    for (const item of invoice.items) {
      await db.run(`
        INSERT INTO invoice_items (invoiceId, description, quantity, price, gstCategory)
        VALUES (?, ?, ?, ?, ?)
      `, [
        invoice.id,
        item.description,
        item.quantity,
        item.price,
        item.gstCategory || ''
      ]);
    }
    
    await db.run('COMMIT');
    return true;
  } catch (error) {
    console.error('Error saving invoice:', error);
    await db.run('ROLLBACK');
    throw error;
  }
});

ipcMain.handle('delete-invoice', async (event, id) => {
  try {
    await db.run('BEGIN TRANSACTION');
    await db.run('DELETE FROM invoice_items WHERE invoiceId = ?', [id]);
    await db.run('DELETE FROM invoices WHERE id = ?', [id]);
    await db.run('COMMIT');
    return true;
  } catch (error) {
    console.error('Error deleting invoice:', error);
    await db.run('ROLLBACK');
    throw error;
  }
});

ipcMain.handle('get-company-info', async () => {
  try {
    return await db.get('SELECT * FROM company WHERE id = 1');
  } catch (error) {
    console.error('Error getting company info:', error);
    throw error;
  }
});

ipcMain.handle('save-company-info', async (event, company) => {
  try {
    await db.run(`
      INSERT OR REPLACE INTO company (
        id, name, address, phone, email, gstin, bank_name, bank_account, bank_ifsc
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      company.name,
      company.address,
      company.phone,
      company.email,
      company.gstin,
      company.bank_name,
      company.bank_account,
      company.bank_ifsc
    ]);
    return true;
  } catch (error) {
    console.error('Error saving company info:', error);
    throw error;
  }
}); 