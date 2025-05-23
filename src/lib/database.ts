
'use server';

import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import { InvoiceFormValues } from '@/components/invoice-form';
import path from 'path';
import { hash, compare } from 'bcrypt';

export interface StoredInvoice extends InvoiceFormValues {
  id: string;
  status: "Paid" | "Pending" | "Overdue" | "Draft" | "Unpaid" | "Partially Paid";
  amount: number;
}

export interface User {
  id: string;
  username: string;
  password?: string; // Hashed password, optional for reads
  role: 'admin' | 'user';
  name: string;
  email: string;
  isActive: boolean;
  isSystemAdmin: boolean;
}

let db: Database | null = null;

// Function to determine the database path
// This needs to be callable from both Electron main process and Next.js server context
function getDbPath() {
  // Check if running in Electron's main process by trying to access electron app module
  try {
    // This 'require' will only work in Node.js environments (like Electron main or Next.js server)
    // It will fail in browser/renderer, but this function is not intended for renderer.
    const electronApp = require('electron').app;
    if (electronApp) {
      return path.join(electronApp.getPath('userData'), 'invoiceflow.db');
    }
  } catch (e) {
    // If 'electron' module is not found, we are likely in Next.js server context
    // Or the seed script which runs directly with Node.
  }
  // Fallback for Next.js server-side or seed script (development)
  return path.join(process.cwd(), 'invoiceflow.db');
}


// Initialize the database
export async function initDatabase(): Promise<Database> {
  if (db) return db;
  
  try {
    const dbPath = getDbPath();
    console.log('Database path:', dbPath); // Log the path being used

    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
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
        description TEXT,
        price REAL,
        imageUrl TEXT,
        gstCategory TEXT,
        gstType TEXT, 
        gstRate REAL,
        igstRate REAL, 
        cgstRate REAL,
        sgstRate REAL 
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
      await db.run(`
        INSERT INTO users (id, username, password, role, name, email, isActive, isSystemAdmin)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `user_admin_${Date.now()}`, 'admin', hashedPassword, 'admin', 'System Administrator', 'admin@invoiceflow.com', 1, 1
      ]);
      console.log('Default admin user created in database.ts');
    }
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Database initialization error in database.ts:', error);
    // If db initialization failed, make sure db remains null
    db = null; 
    throw error;
  }
}

// Function to close the database connection, useful for Electron app shutdown
export async function closeDatabase() {
  if (db) {
    await db.close();
    db = null;
    console.log('Database connection closed.');
  }
}

// User management functions
export async function getAllUsers(): Promise<Omit<User, 'password'>[]> {
  const currentDb = await initDatabase();
  const usersData = await currentDb.all('SELECT id, username, role, name, email, isActive, isSystemAdmin FROM users ORDER BY username');
  return usersData.map((u: any) => ({ ...u, isActive: !!u.isActive, isSystemAdmin: !!u.isSystemAdmin }));
}

export async function getUserById(id: string): Promise<Omit<User, 'password'> | null> {
  const currentDb = await initDatabase();
  const userData = await currentDb.get('SELECT id, username, role, name, email, isActive, isSystemAdmin FROM users WHERE id = ?', [id]);
  if (!userData) return null;
  return { ...userData, isActive: !!userData.isActive, isSystemAdmin: !!userData.isSystemAdmin };
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const currentDb = await initDatabase();
  const userData = await currentDb.get('SELECT * FROM users WHERE username = ?', [username]);
   if (!userData) return null;
  return { ...userData, isActive: !!userData.isActive, isSystemAdmin: !!userData.isSystemAdmin };
}

export async function createUser(userData: Omit<User, 'id' | 'isSystemAdmin'>): Promise<string> {
  const currentDb = await initDatabase();
  const existingUser = await currentDb.get('SELECT id FROM users WHERE username = ?', [userData.username]);
  if (existingUser) {
    throw new Error('Username already exists.');
  }
  const hashedPassword = await hash(userData.password!, 10); // Password must be provided for new user
  const newUserId = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  await currentDb.run(
    'INSERT INTO users (id, username, password, role, name, email, isActive, isSystemAdmin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [newUserId, userData.username, hashedPassword, userData.role, userData.name || '', userData.email || '', userData.isActive ? 1 : 0, 0]
  );
  return newUserId;
}

export async function updateUser(id: string, userData: Partial<Omit<User, 'id' | 'isSystemAdmin'>>): Promise<boolean> {
  const currentDb = await initDatabase();
  const currentUser = await currentDb.get('SELECT * FROM users WHERE id = ?', [id]);
  if (!currentUser) throw new Error('User not found.');

  const updates: string[] = [];
  const params: any[] = [];

  if (userData.username && userData.username !== currentUser.username) {
    const existingUser = await currentDb.get('SELECT id FROM users WHERE username = ? AND id != ?', [userData.username, id]);
    if (existingUser) throw new Error('Username already exists.');
    updates.push('username = ?');
    params.push(userData.username);
  }
  if (userData.password) {
    const hashedPassword = await hash(userData.password, 10);
    updates.push('password = ?');
    params.push(hashedPassword);
  }
  if (userData.role && (!currentUser.isSystemAdmin || userData.role === 'admin')) { // System admin role cannot be changed from admin
    updates.push('role = ?');
    params.push(userData.role);
  }
  if (userData.name !== undefined) {
    updates.push('name = ?');
    params.push(userData.name);
  }
  if (userData.email !== undefined) {
    updates.push('email = ?');
    params.push(userData.email);
  }
  if (userData.isActive !== undefined && (!currentUser.isSystemAdmin || userData.isActive)) { // System admin cannot be deactivated
    updates.push('isActive = ?');
    params.push(userData.isActive ? 1 : 0);
  }

  if (updates.length === 0) return true;

  const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
  params.push(id);
  await currentDb.run(query, params);
  return true;
}

export async function deleteUser(id: string): Promise<boolean> {
  const currentDb = await initDatabase();
  const user = await currentDb.get('SELECT isSystemAdmin FROM users WHERE id = ?', [id]);
  if (!user) throw new Error('User not found.');
  if (user.isSystemAdmin) throw new Error('System admin user cannot be deleted.');
  
  await currentDb.run('DELETE FROM users WHERE id = ?', [id]);
  return true;
}

export async function validateUserCredentials(username: string, passwordAttempt: string): Promise<Omit<User, 'password'> | null> {
  const currentDb = await initDatabase();
  const user = await getUserByUsername(username); // This already uses currentDb via initDatabase()
  if (!user || !user.isActive || !user.password) return null;

  const isMatch = await compare(passwordAttempt, user.password);
  if (!isMatch) return null;

  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}


// Get all invoices
export async function getAllInvoices(): Promise<StoredInvoice[]> {
  const currentDb = await initDatabase();
  const invoices = await currentDb.all('SELECT * FROM invoices ORDER BY invoiceDate DESC');
  const result: StoredInvoice[] = [];
  const allProds = await getAllProducts(); // Fetch once

  for (const invoice of invoices) {
    const items = await currentDb.all('SELECT * FROM invoice_items WHERE invoiceId = ?', [invoice.id]);
    const shipmentDetails = await currentDb.get('SELECT * FROM shipment_details WHERE invoiceId = ?', [invoice.id]);
    result.push({
      ...invoice,
      invoiceDate: new Date(invoice.invoiceDate),
      dueDate: new Date(invoice.dueDate),
      items: items.map(item => {
        const product = allProds.find(p=>p.id === item.productId);
        return {
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            gstCategory: item.gstCategory || '',
            applyIgst: item.gstType === 'IGST' || !item.gstType,
            applyCgst: item.gstType === 'CGST_SGST',
            applySgst: item.gstType === 'CGST_SGST',
            igstRate: item.gstType === 'IGST' ? (item.gstRate ?? product?.igstRate ?? 18) : (product?.igstRate ?? 18),
            cgstRate: item.gstType === 'CGST_SGST' ? (item.gstRate ? item.gstRate / 2 : (product?.cgstRate ?? 9)) : (product?.cgstRate ?? 9),
            sgstRate: item.gstType === 'CGST_SGST' ? (item.gstRate ? item.gstRate / 2 : (product?.sgstRate ?? 9)) : (product?.sgstRate ?? 9),
        };
      }),
      shipmentDetails: shipmentDetails ? {
        shipDate: shipmentDetails.shipDate ? new Date(shipmentDetails.shipDate) : null,
        trackingNumber: shipmentDetails.trackingNumber,
        carrierName: shipmentDetails.carrierName,
        shippingAddress: shipmentDetails.shippingAddress
      } : { shipDate: null, trackingNumber: "", carrierName: "", shippingAddress: "" }
    });
  }
  return result;
}

export async function saveInvoice(invoice: StoredInvoice): Promise<boolean> {
  const currentDb = await initDatabase();
  await currentDb.run('BEGIN TRANSACTION');
  try {
    await currentDb.run(`
      INSERT OR REPLACE INTO invoices (id, invoiceNumber, customerId, customerName, customerEmail, customerAddress, invoiceDate, dueDate, notes, termsAndConditions, invoiceImage, status, amount, paymentStatus, paymentMethod) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
      [invoice.id, invoice.invoiceNumber, invoice.customerId, invoice.customerName, invoice.customerEmail || '', invoice.customerAddress || '', invoice.invoiceDate.toISOString(), invoice.dueDate.toISOString(), invoice.notes || '', invoice.termsAndConditions || '', invoice.invoiceImage || '', invoice.status, invoice.amount, invoice.paymentStatus, invoice.paymentMethod || '']
    );
    await currentDb.run('DELETE FROM invoice_items WHERE invoiceId = ?', [invoice.id]);
    for (const item of invoice.items) {
      let gstType = 'IGST';
      let gstRate = item.igstRate;
      if (item.applyCgst || item.applySgst) {
        gstType = 'CGST_SGST';
        gstRate = (item.cgstRate || 0) + (item.sgstRate || 0);
      }
      await currentDb.run('INSERT INTO invoice_items (invoiceId, productId, description, quantity, price, gstCategory, gstType, gstRate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
        [invoice.id, item.productId, item.description, item.quantity, item.price, item.gstCategory || '', gstType, gstRate]
      );
    }
    await currentDb.run('DELETE FROM shipment_details WHERE invoiceId = ?', [invoice.id]);
    if (invoice.shipmentDetails) {
        await currentDb.run('INSERT INTO shipment_details (invoiceId, shipDate, trackingNumber, carrierName, shippingAddress) VALUES (?, ?, ?, ?, ?)',
        [invoice.id, invoice.shipmentDetails.shipDate ? new Date(invoice.shipmentDetails.shipDate).toISOString() : null, invoice.shipmentDetails.trackingNumber, invoice.shipmentDetails.carrierName, invoice.shipmentDetails.shippingAddress]);
    }
    await currentDb.run('COMMIT');
    return true;
  } catch (error) {
    console.error('Error saving invoice in database.ts:', error);
    await currentDb.run('ROLLBACK');
    return false;
  }
}

export async function getInvoiceById(id: string): Promise<StoredInvoice | null> {
  const currentDb = await initDatabase();
  const invoiceData = await currentDb.get('SELECT * FROM invoices WHERE id = ?', [id]);
  if (!invoiceData) return null;
  const itemsData = await currentDb.all('SELECT * FROM invoice_items WHERE invoiceId = ?', [id]);
  const shipmentDetailsData = await currentDb.get('SELECT * FROM shipment_details WHERE invoiceId = ?', [id]);
  
  const allProducts = await getAllProducts(); // Fetch product details for GST rates

  return {
    ...invoiceData,
    invoiceDate: new Date(invoiceData.invoiceDate),
    dueDate: new Date(invoiceData.dueDate),
    items: itemsData.map(item => {
      const product = allProducts.find(p=>p.id === item.productId);
      return {
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        gstCategory: item.gstCategory || '',
        applyIgst: item.gstType === 'IGST' || !item.gstType, // Default to IGST if type is missing
        applyCgst: item.gstType === 'CGST_SGST',
        applySgst: item.gstType === 'CGST_SGST',
        igstRate: item.gstType === 'IGST' ? (item.gstRate ?? product?.igstRate ?? 18) : (product?.igstRate ?? 18),
        cgstRate: item.gstType === 'CGST_SGST' ? (item.gstRate ? item.gstRate / 2 : (product?.cgstRate ?? 9)) : (product?.cgstRate ?? 9),
        sgstRate: item.gstType === 'CGST_SGST' ? (item.gstRate ? item.gstRate / 2 : (product?.sgstRate ?? 9)) : (product?.sgstRate ?? 9),
      };
    }),
    shipmentDetails: shipmentDetailsData ? {
      shipDate: shipmentDetailsData.shipDate ? new Date(shipmentDetailsData.shipDate) : null,
      trackingNumber: shipmentDetailsData.trackingNumber,
      carrierName: shipmentDetailsData.carrierName,
      shippingAddress: shipmentDetailsData.shippingAddress
    } : { shipDate: null, trackingNumber: "", carrierName: "", shippingAddress: "" }
  };
}

export async function deleteInvoice(id: string): Promise<boolean> {
  const currentDb = await initDatabase();
  await currentDb.run('BEGIN TRANSACTION');
  try {
    await currentDb.run('DELETE FROM shipment_details WHERE invoiceId = ?', [id]);
    await currentDb.run('DELETE FROM invoice_items WHERE invoiceId = ?', [id]);
    await currentDb.run('DELETE FROM invoices WHERE id = ?', [id]);
    await currentDb.run('COMMIT');
    return true;
  } catch (error) {
    console.error('Error deleting invoice in database.ts:', error);
    await currentDb.run('ROLLBACK');
    return false;
  }
}

export async function saveCompanyInfo(company: any): Promise<boolean> {
  const currentDb = await initDatabase();
  try {
    await currentDb.run('INSERT OR REPLACE INTO company (id, name, address, phone, email, gstin, bank_name, bank_account, bank_ifsc) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)',
      [company.name, company.address, company.phone, company.email, company.gstin, company.bank_name, company.bank_account, company.bank_ifsc]
    );
    return true;
  } catch (error) {
    console.error('Error saving company info in database.ts:', error);
    return false;
  }
}

export async function getCompanyInfo() {
  const currentDb = await initDatabase();
  try {
    return await currentDb.get('SELECT * FROM company WHERE id = 1');
  } catch (error) {
    console.error('Error getting company info in database.ts:', error);
    return null;
  }
}

export async function addCustomer(customer: any): Promise<boolean> {
  const currentDb = await initDatabase();
  try {
    // Check if customer ID already exists
    const existingCustomer = await currentDb.get('SELECT id FROM customers WHERE id = ?', [customer.id]);
    if (existingCustomer) {
        throw new Error(`Customer with ID ${customer.id} already exists.`);
    }
    await currentDb.run('INSERT INTO customers (id, name, email, phone, address) VALUES (?, ?, ?, ?, ?)', 
      [customer.id, customer.name, customer.email, customer.phone, customer.address]);
    return true;
  } catch (error) {
    console.error('Error adding customer in database.ts:', error);
    throw error; // Re-throw to be caught by Electron IPC handler
  }
}

export async function getAllCustomers() {
  const currentDb = await initDatabase();
  try {
    return await currentDb.all('SELECT * FROM customers ORDER BY name');
  } catch (error) {
    console.error('Error getting all customers in database.ts:', error);
    return [];
  }
}

export async function deleteCustomer(id: string): Promise<boolean> {
  const currentDb = await initDatabase();
  try {
    await currentDb.run('DELETE FROM customers WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting customer in database.ts:', error);
    return false;
  }
}

export async function clearAllCustomers(): Promise<boolean> {
  const currentDb = await initDatabase();
  try {
    await currentDb.run('DELETE FROM customers');
    return true;
  } catch (error) {
    console.error('Error clearing customers in database.ts:', error);
    return false;
  }
}

export async function addProduct(product: any): Promise<boolean> {
  const currentDb = await initDatabase();
  try {
    // Check if product ID already exists
    const existingProduct = await currentDb.get('SELECT id FROM products WHERE id = ?', [product.id]);
    if (existingProduct) {
        throw new Error(`Product with ID ${product.id} already exists.`);
    }
    await currentDb.run('INSERT INTO products (id, name, description, price, imageUrl, gstCategory, igstRate, cgstRate, sgstRate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
      [product.id, product.name, product.description, product.price, product.imageUrl, product.gstCategory, product.igstRate, product.cgstRate, product.sgstRate]);
    return true;
  } catch (error) {
    console.error('Error adding product in database.ts:', error);
    throw error; // Re-throw
  }
}

export async function getAllProducts() {
  const currentDb = await initDatabase();
  try {
    return await currentDb.all('SELECT * FROM products ORDER BY name');
  } catch (error) {
    console.error('Error getting all products in database.ts:', error);
    return [];
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  const currentDb = await initDatabase();
  try {
    await currentDb.run('DELETE FROM products WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting product in database.ts:', error);
    return false;
  }
}

export async function clearAllProducts(): Promise<boolean> {
  const currentDb = await initDatabase();
  try {
    await currentDb.run('DELETE FROM products');
    return true;
  } catch (error) {
    console.error('Error clearing products in database.ts:', error);
    return false;
  }
}

export async function clearAllData(): Promise<boolean> {
  const currentDb = await initDatabase();
  await currentDb.run('BEGIN TRANSACTION');
  try {
    await currentDb.run('DELETE FROM invoice_items');
    await currentDb.run('DELETE FROM shipment_details');
    await currentDb.run('DELETE FROM invoices');
    await currentDb.run('DELETE FROM customers');
    await currentDb.run('DELETE FROM products');
    await currentDb.run('DELETE FROM company WHERE id = 1'); // Assumes company info has id 1
    // Keep users table intact, especially the system admin.
    await currentDb.run('COMMIT');
    return true;
  } catch (error) {
    console.error('Error clearing all data in database.ts:', error);
    await currentDb.run('ROLLBACK');
    return false;
  }
}

// Export the getDbPath function for Electron main process to use
export { getDbPath };
