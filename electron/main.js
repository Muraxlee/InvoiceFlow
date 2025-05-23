
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
        customerId TEXT,
        customerName TEXT,
        customerEmail TEXT,
        customerAddress TEXT,
        invoiceDate TEXT,
        dueDate TEXT,
        notes TEXT,
        termsAndConditions TEXT,
        invoiceImage TEXT,
        status TEXT,
        amount REAL,
        paymentStatus TEXT,
        paymentMethod TEXT
      );
      
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoiceId TEXT,
        productId TEXT,
        description TEXT,
        quantity REAL,
        price REAL,
        gstCategory TEXT,
        gstType TEXT, 
        gstRate REAL,
        FOREIGN KEY (invoiceId) REFERENCES invoices (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS shipment_details (
        invoiceId TEXT PRIMARY KEY,
        shipDate TEXT,
        trackingNumber TEXT,
        carrierName TEXT,
        shippingAddress TEXT,
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

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        imageUrl TEXT,
        description TEXT,
        price REAL,
        gstCategory TEXT,
        igstRate REAL,
        cgstRate REAL,
        sgstRate REAL
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

// --- Invoice IPC Handlers ---
ipcMain.handle('get-all-invoices', async () => {
  try {
    const invoices = await db.all('SELECT * FROM invoices ORDER BY invoiceDate DESC');
    for (const invoice of invoices) {
      const items = await db.all('SELECT * FROM invoice_items WHERE invoiceId = ?', [invoice.id]);
      invoice.items = items; // these are simplified, form expects more detail
      invoice.invoiceDate = new Date(invoice.invoiceDate);
      invoice.dueDate = new Date(invoice.dueDate);
      // Note: full item structure including GST types/rates might be needed by form
      invoice.items = items.map(item => ({
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        gstCategory: item.gstCategory,
        // Defaulting GST types and rates if not in DB or for older records
        applyIgst: item.gstType === 'IGST' || !item.gstType, // Default to IGST if type is missing
        applyCgst: item.gstType === 'CGST_SGST',
        applySgst: item.gstType === 'CGST_SGST',
        igstRate: item.gstRate !== undefined ? item.gstRate : 18,
        cgstRate: item.gstType === 'CGST_SGST' && item.gstRate !== undefined ? item.gstRate / 2 : 9, // Simplification
        sgstRate: item.gstType === 'CGST_SGST' && item.gstRate !== undefined ? item.gstRate / 2 : 9, // Simplification
      }));

      const shipmentDetails = await db.get('SELECT * FROM shipment_details WHERE invoiceId = ?', [invoice.id]);
      invoice.shipmentDetails = shipmentDetails || { shipDate: null, trackingNumber: "", carrierName: "", shippingAddress: "" };
      if (invoice.shipmentDetails.shipDate) {
        invoice.shipmentDetails.shipDate = new Date(invoice.shipmentDetails.shipDate);
      }
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
    
    const items = await db.all('SELECT * FROM invoice_items WHERE invoiceId = ?', [id]);
    invoice.invoiceDate = new Date(invoice.invoiceDate);
    invoice.dueDate = new Date(invoice.dueDate);
    invoice.items = items.map(item => ({
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        gstCategory: item.gstCategory,
        applyIgst: item.gstType === 'IGST' || !item.gstType,
        applyCgst: item.gstType === 'CGST_SGST',
        applySgst: item.gstType === 'CGST_SGST',
        igstRate: item.gstRate !== undefined ? item.gstRate : 18,
        cgstRate: item.gstType === 'CGST_SGST' && item.gstRate !== undefined ? item.gstRate / 2 : 9,
        sgstRate: item.gstType === 'CGST_SGST' && item.gstRate !== undefined ? item.gstRate / 2 : 9,
      }));
    
    const shipmentDetails = await db.get('SELECT * FROM shipment_details WHERE invoiceId = ?', [id]);
    invoice.shipmentDetails = shipmentDetails || { shipDate: null, trackingNumber: "", carrierName: "", shippingAddress: "" };
     if (invoice.shipmentDetails.shipDate) {
        invoice.shipmentDetails.shipDate = new Date(invoice.shipmentDetails.shipDate);
      }
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
        id, invoiceNumber, customerId, customerName, customerEmail, customerAddress, 
        invoiceDate, dueDate, notes, termsAndConditions, invoiceImage, status, amount,
        paymentStatus, paymentMethod
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invoice.id,
      invoice.invoiceNumber,
      invoice.customerId,
      invoice.customerName,
      invoice.customerEmail || '',
      invoice.customerAddress || '',
      invoice.invoiceDate, // Should be ISO string from preload
      invoice.dueDate,     // Should be ISO string from preload
      invoice.notes || '',
      invoice.termsAndConditions || '',
      invoice.invoiceImage || '',
      invoice.status,
      invoice.amount,
      invoice.paymentStatus,
      invoice.paymentMethod || ''
    ]);
    
    await db.run('DELETE FROM invoice_items WHERE invoiceId = ?', [invoice.id]);
    
    for (const item of invoice.items) {
      let gstType = 'IGST';
      let gstRate = item.igstRate;
      if (item.applyCgst || item.applySgst) {
        gstType = 'CGST_SGST';
        gstRate = item.cgstRate + item.sgstRate; // Or handle based on which is primary
      }

      await db.run(`
        INSERT INTO invoice_items (invoiceId, productId, description, quantity, price, gstCategory, gstType, gstRate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        invoice.id,
        item.productId,
        item.description,
        item.quantity,
        item.price,
        item.gstCategory || '',
        gstType,
        gstRate
      ]);
    }

    await db.run('DELETE FROM shipment_details WHERE invoiceId = ?', [invoice.id]);
    if (invoice.shipmentDetails) {
        await db.run(`
            INSERT INTO shipment_details (invoiceId, shipDate, trackingNumber, carrierName, shippingAddress)
            VALUES (?, ?, ?, ?, ?)
        `,[
            invoice.id,
            invoice.shipmentDetails.shipDate ? new Date(invoice.shipmentDetails.shipDate).toISOString() : null,
            invoice.shipmentDetails.trackingNumber,
            invoice.shipmentDetails.carrierName,
            invoice.shipmentDetails.shippingAddress
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
    await db.run('DELETE FROM shipment_details WHERE invoiceId = ?', [id]);
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

// --- Company Info Handlers ---
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

// --- Customer Handlers ---
ipcMain.handle('get-all-customers', async () => {
  try {
    return await db.all('SELECT * FROM customers ORDER BY name');
  } catch (error) {
    console.error('Error getting customers:', error);
    throw error;
  }
});

ipcMain.handle('add-customer', async (event, customer) => {
  try {
    await db.run(
      'INSERT INTO customers (id, name, email, phone, address) VALUES (?, ?, ?, ?, ?)',
      [customer.id, customer.name, customer.email, customer.phone, customer.address]
    );
    return true;
  } catch (error) {
    console.error('Error adding customer:', error);
    throw error;
  }
});

ipcMain.handle('delete-customer', async (event, id) => {
  try {
    await db.run('DELETE FROM customers WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
});

ipcMain.handle('clear-all-customers', async () => {
  try {
    await db.run('DELETE FROM customers');
    return true;
  } catch (error) {
    console.error('Error clearing customers:', error);
    throw error;
  }
});

// --- Product Handlers ---
ipcMain.handle('get-all-products', async () => {
  try {
    return await db.all('SELECT * FROM products ORDER BY name');
  } catch (error) {
    console.error('Error getting products:', error);
    throw error;
  }
});

ipcMain.handle('add-product', async (event, product) => {
  try {
    await db.run(
      'INSERT INTO products (id, name, imageUrl, description, price, gstCategory, igstRate, cgstRate, sgstRate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [product.id, product.name, product.imageUrl, product.description, product.price, product.gstCategory, product.igstRate, product.cgstRate, product.sgstRate]
    );
    return true;
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
});

ipcMain.handle('delete-product', async (event, id) => {
  try {
    await db.run('DELETE FROM products WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
});

ipcMain.handle('clear-all-products', async () => {
  try {
    await db.run('DELETE FROM products');
    return true;
  } catch (error) {
    console.error('Error clearing products:', error);
    throw error;
  }
});

// --- General Data Clear Handler ---
ipcMain.handle('clear-all-data', async () => {
  try {
    await db.run('BEGIN TRANSACTION');
    await db.run('DELETE FROM invoice_items');
    await db.run('DELETE FROM shipment_details');
    await db.run('DELETE FROM invoices');
    await db.run('DELETE FROM customers');
    await db.run('DELETE FROM products');
    await db.run('DELETE FROM company WHERE id = 1'); // Keep company table, clear row
    // Note: User table is not cleared by this generic action for security.
    await db.run('COMMIT');
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    await db.run('ROLLBACK');
    throw error;
  }
});
