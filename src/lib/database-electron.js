
// CommonJS version of database.ts for use in Electron main process
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const { hash, compare } = require('bcrypt');
const { app } = require('electron');

let db = null;

// Get the database path based on electron's userData folder
function getDbPath() {
  // If running in a packaged app, app might not be available immediately at module load.
  // It's better to get it when the function is called or ensure it's initialized.
  const currentApp = app || require('electron').remote?.app; // A common pattern for safety
  if (!currentApp) {
    console.error("Electron app object is not available for getDbPath. Falling back to CWD.");
    // Fallback to project root if app is not available (e.g., during some test/script scenarios)
    // This fallback is less ideal for production packaged apps.
    return path.join(process.cwd(), 'invoiceflow.db');
  }
  return path.join(currentApp.getPath('userData'), 'invoiceflow.db');
}

// Initialize the database
async function initDatabase() {
  if (db) return db;

  try {
    const dbPath = getDbPath();
    console.log('Database path:', dbPath);

    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY, invoiceNumber TEXT UNIQUE, customerId TEXT, customerName TEXT, customerEmail TEXT, customerAddress TEXT, invoiceDate TEXT, dueDate TEXT, notes TEXT, termsAndConditions TEXT, status TEXT, amount REAL, paymentStatus TEXT, paymentMethod TEXT
      );
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT, invoiceId TEXT, productId TEXT, description TEXT, quantity REAL, price REAL, gstCategory TEXT, gstType TEXT, gstRate REAL, FOREIGN KEY (invoiceId) REFERENCES invoices (id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS shipment_details (
        invoiceId TEXT PRIMARY KEY,
        shipDate TEXT,
        trackingNumber TEXT,
        carrierName TEXT,
        consigneeName TEXT,
        consigneeAddress TEXT,
        consigneeGstin TEXT,
        consigneeStateCode TEXT,
        transportationMode TEXT,
        lrNo TEXT,
        vehicleNo TEXT,
        dateOfSupply TEXT,
        placeOfSupply TEXT,
        FOREIGN KEY (invoiceId) REFERENCES invoices (id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS company (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        phone2 TEXT,
        email TEXT,
        gstin TEXT,
        bank_account_name TEXT,
        bank_name TEXT,
        bank_account TEXT,
        bank_ifsc TEXT
      );
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT
      );
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, price REAL, imageUrl TEXT, gstCategory TEXT, gstType TEXT, gstRate REAL, igstRate REAL, cgstRate REAL, sgstRate REAL
      );
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        name TEXT,
        email TEXT,
        isActive INTEGER DEFAULT 1,
        isSystemAdmin INTEGER DEFAULT 0
      );
    `);

    const adminExists = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
    if (!adminExists) {
      const hashedPassword = await hash('admin123', 10);
      await db.run(
        'INSERT INTO users (id, username, password, role, name, email, isActive, isSystemAdmin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [`user_admin_${Date.now()}`, 'admin', hashedPassword, 'admin', 'System Administrator', 'admin@invoiceflow.com', 1, 1]
      );
      console.log('Default admin user created');
    }
    
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    db = null;
    throw error;
  }
}

// Close the database connection
async function closeDatabase() {
  if (db) {
    await db.close();
    db = null;
    console.log('Database connection closed.');
  }
}

// User Management Functions
async function getAllUsers() {
  const currentDb = await initDatabase();
  const usersData = await currentDb.all('SELECT id, username, role, name, email, isActive, isSystemAdmin FROM users ORDER BY username');
  return usersData.map((u) => ({ ...u, isActive: !!u.isActive, isSystemAdmin: !!u.isSystemAdmin }));
}

async function getUserById(id) {
  const currentDb = await initDatabase();
  const userData = await currentDb.get('SELECT id, username, role, name, email, isActive, isSystemAdmin FROM users WHERE id = ?', [id]);
  if (!userData) return null;
  return { ...userData, isActive: !!userData.isActive, isSystemAdmin: !!userData.isSystemAdmin };
}

async function getUserByUsername(username) {
  const currentDb = await initDatabase();
  const userData = await currentDb.get('SELECT * FROM users WHERE username = ?', [username]);
  if (!userData) return null;
  return { ...userData, isActive: !!userData.isActive, isSystemAdmin: !!userData.isSystemAdmin };
}

async function createUser(userData) {
  const currentDb = await initDatabase();
  const existingUser = await currentDb.get('SELECT id FROM users WHERE username = ?', [userData.username]);
  if (existingUser) throw new Error('Username already exists.');
  if (!userData.password) throw new Error('Password is required to create a user.');
  const hashedPassword = await hash(userData.password, 10);
  const newUserId = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  await currentDb.run(
    'INSERT INTO users (id, username, password, role, name, email, isActive, isSystemAdmin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [newUserId, userData.username, hashedPassword, userData.role, userData.name || '', userData.email || '', userData.isActive !== undefined ? (userData.isActive ? 1 : 0) : 1, 0]
  );
  return newUserId;
}

async function updateUser(id, userData) {
  const currentDb = await initDatabase();
  const currentUser = await currentDb.get('SELECT * FROM users WHERE id = ?', [id]);
  if (!currentUser) throw new Error('User not found.');

  const updates = [];
  const params = [];

  if (userData.username && userData.username !== currentUser.username) {
    const existingUser = await currentDb.get('SELECT id FROM users WHERE username = ? AND id != ?', [userData.username, id]);
    if (existingUser) throw new Error('Username already exists.');
    updates.push('username = ?'); params.push(userData.username);
  }
  if (userData.password) {
    const hashedPassword = await hash(userData.password, 10);
    updates.push('password = ?'); params.push(hashedPassword);
  }
  if (userData.role && (!currentUser.isSystemAdmin || userData.role === 'admin')) {
    updates.push('role = ?'); params.push(userData.role);
  }
  if (userData.name !== undefined) { updates.push('name = ?'); params.push(userData.name); }
  if (userData.email !== undefined) { updates.push('email = ?'); params.push(userData.email); }
  if (userData.isActive !== undefined && (!currentUser.isSystemAdmin || userData.isActive === true)) {
    updates.push('isActive = ?'); params.push(userData.isActive ? 1 : 0);
  } else if (userData.isActive === false && currentUser.isSystemAdmin) {
    throw new Error("System admin cannot be deactivated.");
  }

  if (updates.length === 0) return true; // No changes to apply

  const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
  params.push(id);
  await currentDb.run(query, params);
  return true;
}

async function deleteUser(id) {
  const currentDb = await initDatabase();
  const user = await currentDb.get('SELECT isSystemAdmin FROM users WHERE id = ?', [id]);
  if (!user) throw new Error('User not found.');
  if (user.isSystemAdmin) throw new Error('System admin user cannot be deleted.');
  await currentDb.run('DELETE FROM users WHERE id = ?', [id]); 
  return true;
}

async function validateUserCredentials(username, passwordAttempt) {
  const user = await getUserByUsername(username); // This already calls initDatabase
  if (!user || !user.isActive || !user.password) return null;
  const isMatch = await compare(passwordAttempt, user.password);
  if (!isMatch) return null;
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// Invoice Functions
async function getAllInvoices() {
  const currentDb = await initDatabase();
  const invoicesRaw = await currentDb.all('SELECT * FROM invoices ORDER BY invoiceDate DESC');
  return invoicesRaw.map(inv => ({
    ...inv,
    invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate) : new Date(),
    dueDate: inv.dueDate ? new Date(inv.dueDate) : new Date(),
  }));
}

async function getInvoiceById(id) {
  const currentDb = await initDatabase();
  const invoice = await currentDb.get('SELECT * FROM invoices WHERE id = ?', [id]);
  if (!invoice) return null;

  const items = await currentDb.all('SELECT * FROM invoice_items WHERE invoiceId = ?', [id]);
  const shipmentDetails = await currentDb.get('SELECT * FROM shipment_details WHERE invoiceId = ?', [id]);
  
  return {
    ...invoice,
    invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate) : new Date(),
    dueDate: invoice.dueDate ? new Date(invoice.dueDate) : new Date(),
    items: items || [],
    shipmentDetails: shipmentDetails || {}
  };
}

async function saveInvoice(invoice) {
  const currentDb = await initDatabase();
  const { id, items, shipmentDetails, ...invoiceData } = invoice;
  
  try {
    await currentDb.run('BEGIN TRANSACTION');
    
    const exists = await currentDb.get('SELECT id FROM invoices WHERE id = ?', [id]);
    
    const invoiceDateISO = invoiceData.invoiceDate instanceof Date ? invoiceData.invoiceDate.toISOString() : invoiceData.invoiceDate;
    const dueDateISO = invoiceData.dueDate instanceof Date ? invoiceData.dueDate.toISOString() : invoiceData.dueDate;
    
    const dbInvoiceData = {...invoiceData, invoiceDate: invoiceDateISO, dueDate: dueDateISO};

    if (exists) {
      const cols = Object.keys(dbInvoiceData).map(key => `${key} = ?`).join(', ');
      const values = Object.values(dbInvoiceData);
      await currentDb.run(`UPDATE invoices SET ${cols} WHERE id = ?`, [...values, id]);
      await currentDb.run('DELETE FROM invoice_items WHERE invoiceId = ?', [id]);
    } else {
      const cols = Object.keys(dbInvoiceData).join(', ');
      const placeholders = Object.values(dbInvoiceData).map(() => '?').join(', ');
      await currentDb.run(
        `INSERT INTO invoices (id, ${cols}) VALUES (?, ${placeholders})`,
        [id, ...Object.values(dbInvoiceData)]
      );
    }
    
    if (items && items.length > 0) {
      for (const item of items) {
        const { id: itemId, ...itemData } = item;
        const itemCols = Object.keys({...itemData, invoiceId: id}).join(', ');
        const itemValues = Object.values({...itemData, invoiceId: id});
        const itemPlaceholders = itemValues.map(() => '?').join(', ');
        
        await currentDb.run(
          `INSERT INTO invoice_items (${itemCols}) VALUES (${itemPlaceholders})`,
          itemValues
        );
      }
    }
    
    if (shipmentDetails) {
      const shipExists = await currentDb.get('SELECT invoiceId FROM shipment_details WHERE invoiceId = ?', [id]);
      const dbShipmentDetails = {
          ...shipmentDetails,
          shipDate: shipmentDetails.shipDate instanceof Date ? shipmentDetails.shipDate.toISOString() : shipmentDetails.shipDate,
          dateOfSupply: shipmentDetails.dateOfSupply instanceof Date ? shipmentDetails.dateOfSupply.toISOString() : shipmentDetails.dateOfSupply
      };
      
      if (shipExists) {
        const shipCols = Object.keys(dbShipmentDetails).map(key => `${key} = ?`).join(', ');
        const shipValues = Object.values(dbShipmentDetails);
        await currentDb.run(`UPDATE shipment_details SET ${shipCols} WHERE invoiceId = ?`, [...shipValues, id]);
      } else if (Object.values(dbShipmentDetails).some(v => v !== null && v !== "" && v !== undefined)) { // Insert only if there's actual data
        const shipCols = Object.keys({...dbShipmentDetails, invoiceId: id}).join(', ');
        const shipValues = Object.values({...dbShipmentDetails, invoiceId: id});
        const shipPlaceholders = shipValues.map(() => '?').join(', ');
        
        await currentDb.run(
          `INSERT INTO shipment_details (${shipCols}) VALUES (${shipPlaceholders})`,
          shipValues
        );
      }
    }
    
    await currentDb.run('COMMIT');
    return true;
  } catch (error) {
    await currentDb.run('ROLLBACK');
    console.error('Error saving invoice:', error);
    throw error;
  }
}

async function deleteInvoice(id) {
  const currentDb = await initDatabase();
  await currentDb.run('DELETE FROM invoices WHERE id = ?', [id]);
  return true;
}

// Company Functions
async function saveCompanyInfo(company) {
  const currentDb = await initDatabase();
  const exists = await currentDb.get('SELECT id FROM company WHERE id = 1');
  
  if (exists) {
    const cols = Object.keys(company).map(key => `${key} = ?`).join(', ');
    const values = Object.values(company);
    await currentDb.run(`UPDATE company SET ${cols} WHERE id = 1`, values);
  } else {
    const cols = Object.keys(company).join(', ');
    const placeholders = Object.values(company).map(() => '?').join(', ');
    await currentDb.run(
      `INSERT INTO company (id, ${cols}) VALUES (1, ${placeholders})`,
      Object.values(company)
    );
  }
  
  return true;
}

async function getCompanyInfo() {
  const currentDb = await initDatabase();
  return await currentDb.get('SELECT * FROM company WHERE id = 1');
}

// Customer Functions
async function addCustomer(customer) {
  const currentDb = await initDatabase();
  const cols = Object.keys(customer).join(', ');
  const placeholders = Object.values(customer).map(() => '?').join(', ');
  
  await currentDb.run(
    `INSERT INTO customers (${cols}) VALUES (${placeholders})`,
    Object.values(customer)
  );
  
  return true;
}

async function updateCustomer(customerId, customerData) {
  const currentDb = await initDatabase();
  const updates = Object.keys(customerData).map(key => `${key} = ?`);
  const params = [...Object.values(customerData), customerId];
  const query = `UPDATE customers SET ${updates.join(', ')} WHERE id = ?`;
  await currentDb.run(query, params);
  return true;
}

async function getAllCustomers() {
  const currentDb = await initDatabase();
  return await currentDb.all('SELECT * FROM customers ORDER BY name');
}

async function deleteCustomer(id) {
  const currentDb = await initDatabase();
  await currentDb.run('DELETE FROM customers WHERE id = ?', [id]);
  return true;
}

async function clearAllCustomers() {
  const currentDb = await initDatabase();
  await currentDb.run('DELETE FROM customers');
  return true;
}

// Product Functions
async function addProduct(product) {
  const currentDb = await initDatabase();
  const cols = Object.keys(product).join(', ');
  const placeholders = Object.values(product).map(() => '?').join(', ');
  
  await currentDb.run(
    `INSERT INTO products (${cols}) VALUES (${placeholders})`,
    Object.values(product)
  );
  
  return true;
}

async function updateProduct(productId, productData) {
  const currentDb = await initDatabase();
  const updates = Object.keys(productData).map(key => `${key} = ?`);
  const params = [...Object.values(productData), productId];
  const query = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
  await currentDb.run(query, params);
  return true;
}

async function getAllProducts() {
  const currentDb = await initDatabase();
  return await currentDb.all('SELECT * FROM products ORDER BY name');
}

async function deleteProduct(id) {
  const currentDb = await initDatabase();
  await currentDb.run('DELETE FROM products WHERE id = ?', [id]);
  return true;
}

async function clearAllProducts() {
  const currentDb = await initDatabase();
  await currentDb.run('DELETE FROM products');
  return true;
}

// Utility Functions
async function clearAllData() {
  const currentDb = await initDatabase();
  await currentDb.run('BEGIN TRANSACTION');
  try {
    await currentDb.run('DELETE FROM invoice_items');
    await currentDb.run('DELETE FROM shipment_details');
    await currentDb.run('DELETE FROM invoices');
    await currentDb.run('DELETE FROM customers');
    await currentDb.run('DELETE FROM products');
    // Company data is not typically cleared in a "business data" clear,
    // but if needed, add: await currentDb.run('DELETE FROM company WHERE id = 1');
    // Users are also not cleared by this.
    await currentDb.run('COMMIT');
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    await currentDb.run('ROLLBACK');
    return false;
  }
}

// Export all functions
module.exports = {
  getDbPath,
  initDatabase,
  closeDatabase,
  // User Management
  getAllUsers,
  getUserById, // Added for completeness, though not directly used by current IPC
  getUserByUsername, // Ensure this is exported
  createUser,
  updateUser,
  deleteUser,
  validateUserCredentials,
  // Invoice
  getAllInvoices,
  getInvoiceById,
  saveInvoice,
  deleteInvoice,
  // Company
  saveCompanyInfo,
  getCompanyInfo,
  // Customer
  addCustomer,
  updateCustomer, // Added export
  getAllCustomers,
  deleteCustomer,
  clearAllCustomers,
  // Product
  addProduct,
  updateProduct, // Added export
  getAllProducts,
  deleteProduct,
  clearAllProducts,
  // Utility
  clearAllData
}; 

    