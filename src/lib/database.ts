'use server';

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
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
  password: string; // This is hashed
  role: 'admin' | 'user';
  name: string;
  email: string;
  isActive: boolean;
  isSystemAdmin: boolean; // If true, this user can't be deleted
}

let db: any = null;

// Initialize the database
export async function initDatabase() {
  if (db) return db;
  
  try {
    const dbPath = path.join(process.cwd(), 'invoiceflow.db');
    
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
        description TEXT,
        price REAL,
        imageUrl TEXT,
        gstCategory TEXT,
        gstType TEXT,
        gstRate REAL
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
    
    // Check if admin user exists, create if not
    const adminExists = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
    if (!adminExists) {
      // Create default admin user with password 'admin123'
      const hashedPassword = await hash('admin123', 10);
      await db.run(`
        INSERT INTO users (id, username, password, role, name, email, isActive, isSystemAdmin)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'admin',
        'admin',
        hashedPassword,
        'admin',
        'System Administrator',
        'admin@invoiceflow.com',
        1,
        1
      ]);
      console.log('Default admin user created');
    }
    
    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// User management functions
export async function getAllUsers(): Promise<User[]> {
  try {
    await initDatabase();
    
    const users = await db.all(`
      SELECT id, username, role, name, email, isActive, isSystemAdmin FROM users
    `);
    
    return users.map(user => ({
      ...user,
      isActive: Boolean(user.isActive),
      isSystemAdmin: Boolean(user.isSystemAdmin),
      password: '' // Don't return the password
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

export async function getUserById(id: string): Promise<Omit<User, 'password'> | null> {
  try {
    await initDatabase();
    
    const user = await db.get(`
      SELECT id, username, role, name, email, isActive, isSystemAdmin FROM users WHERE id = ?
    `, [id]);
    
    if (!user) return null;
    
    return {
      ...user,
      isActive: Boolean(user.isActive),
      isSystemAdmin: Boolean(user.isSystemAdmin)
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    await initDatabase();
    
    const user = await db.get(`
      SELECT * FROM users WHERE username = ?
    `, [username]);
    
    if (!user) return null;
    
    return {
      ...user,
      isActive: Boolean(user.isActive),
      isSystemAdmin: Boolean(user.isSystemAdmin)
    };
  } catch (error) {
    console.error('Error fetching user by username:', error);
    return null;
  }
}

export async function createUser(user: Omit<User, 'id'>): Promise<string | null> {
  try {
    await initDatabase();
    
    // Check if username already exists
    const existingUser = await db.get(`
      SELECT id FROM users WHERE username = ?
    `, [user.username]);
    
    if (existingUser) {
      throw new Error('Username already exists');
    }
    
    const hashedPassword = await hash(user.password, 10);
    const userId = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    await db.run(`
      INSERT INTO users (id, username, password, role, name, email, isActive, isSystemAdmin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      user.username,
      hashedPassword,
      user.role,
      user.name || '',
      user.email || '',
      user.isActive ? 1 : 0,
      0 // New users can't be system admins
    ]);
    
    return userId;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

export async function updateUser(id: string, userData: Partial<Omit<User, 'id' | 'isSystemAdmin'>>): Promise<boolean> {
  try {
    await initDatabase();
    
    // Get the current user to check if it's a system admin
    const currentUser = await getUserById(id);
    
    if (!currentUser) {
      throw new Error('User not found');
    }
    
    // Check if trying to update a system admin's role
    if (currentUser.isSystemAdmin && userData.role === 'user') {
      throw new Error('Cannot change system admin role');
    }
    
    // Start building the query
    let query = 'UPDATE users SET ';
    const params: any[] = [];
    const fields: string[] = [];
    
    if (userData.username !== undefined) {
      // Check if username already exists for another user
      const existingUser = await db.get(`
        SELECT id FROM users WHERE username = ? AND id != ?
      `, [userData.username, id]);
      
      if (existingUser) {
        throw new Error('Username already exists');
      }
      
      fields.push('username = ?');
      params.push(userData.username);
    }
    
    if (userData.password !== undefined) {
      const hashedPassword = await hash(userData.password, 10);
      fields.push('password = ?');
      params.push(hashedPassword);
    }
    
    if (userData.role !== undefined) {
      fields.push('role = ?');
      params.push(userData.role);
    }
    
    if (userData.name !== undefined) {
      fields.push('name = ?');
      params.push(userData.name);
    }
    
    if (userData.email !== undefined) {
      fields.push('email = ?');
      params.push(userData.email);
    }
    
    if (userData.isActive !== undefined) {
      fields.push('isActive = ?');
      params.push(userData.isActive ? 1 : 0);
    }
    
    if (fields.length === 0) {
      // Nothing to update
      return true;
    }
    
    query += fields.join(', ') + ' WHERE id = ?';
    params.push(id);
    
    await db.run(query, params);
    
    return true;
  } catch (error) {
    console.error('Error updating user:', error);
    return false;
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await initDatabase();
    
    // Check if the user is a system admin
    const user = await getUserById(id);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (user.isSystemAdmin) {
      throw new Error('Cannot delete system admin user');
    }
    
    await db.run('DELETE FROM users WHERE id = ?', [id]);
    
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    return false;
  }
}

export async function validateUserCredentials(username: string, password: string): Promise<Omit<User, 'password'> | null> {
  try {
    await initDatabase();
    
    const user = await getUserByUsername(username);
    
    if (!user || !user.isActive) {
      return null;
    }
    
    const passwordMatch = await compare(password, user.password);
    
    if (!passwordMatch) {
      return null;
    }
    
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error('Error validating user credentials:', error);
    return null;
  }
}

// Get all invoices
export async function getAllInvoices(): Promise<StoredInvoice[]> {
  try {
    await initDatabase();
    
    const invoices = await db.all(`
      SELECT * FROM invoices ORDER BY invoiceDate DESC
    `);
    
    const result: StoredInvoice[] = [];
    
    for (const invoice of invoices) {
      const items = await db.all(`
        SELECT * FROM invoice_items WHERE invoiceId = ?
      `, [invoice.id]);
      
      const shipmentDetails = await db.get(`
        SELECT * FROM shipment_details WHERE invoiceId = ?
      `, [invoice.id]);
      
      result.push({
        ...invoice,
        invoiceDate: new Date(invoice.invoiceDate),
        dueDate: new Date(invoice.dueDate),
        items: items.map(item => ({
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          gstCategory: item.gstCategory,
          gstType: item.gstType || "IGST",
          gstRate: item.gstRate || 18
        })),
        shipmentDetails: shipmentDetails ? {
          shipDate: shipmentDetails.shipDate ? new Date(shipmentDetails.shipDate) : null,
          trackingNumber: shipmentDetails.trackingNumber,
          carrierName: shipmentDetails.carrierName,
          shippingAddress: shipmentDetails.shippingAddress
        } : {
          shipDate: null,
          trackingNumber: "",
          carrierName: "",
          shippingAddress: ""
        }
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }
}

// Save invoice to database
export async function saveInvoice(invoice: StoredInvoice): Promise<boolean> {
  try {
    await initDatabase();
    
    // Start a transaction
    await db.run('BEGIN TRANSACTION');
    
    // Insert invoice
    await db.run(`
      INSERT OR REPLACE INTO invoices (
        id, invoiceNumber, customerId, customerName, customerEmail, customerAddress, 
        invoiceDate, dueDate, notes, termsAndConditions, invoiceImage, status, amount, 
        paymentStatus, paymentMethod
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invoice.id,
      invoice.invoiceNumber,
      invoice.customerId || '',
      invoice.customerName,
      invoice.customerEmail || '',
      invoice.customerAddress || '',
      invoice.invoiceDate.toISOString(),
      invoice.dueDate.toISOString(),
      invoice.notes || '',
      invoice.termsAndConditions || '',
      invoice.invoiceImage || '',
      invoice.status,
      invoice.amount,
      invoice.paymentStatus || 'Unpaid',
      invoice.paymentMethod || ''
    ]);
    
    // Delete existing items
    await db.run(`DELETE FROM invoice_items WHERE invoiceId = ?`, [invoice.id]);
    
    // Insert new items
    for (const item of invoice.items) {
      await db.run(`
        INSERT INTO invoice_items (invoiceId, productId, description, quantity, price, gstCategory, gstType, gstRate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        invoice.id,
        item.productId || '',
        item.description,
        item.quantity,
        item.price,
        item.gstCategory || '',
        item.gstType || 'IGST',
        item.gstRate || 18
      ]);
    }
    
    // Handle shipment details
    if (invoice.shipmentDetails) {
      // Delete existing shipment details
      await db.run(`DELETE FROM shipment_details WHERE invoiceId = ?`, [invoice.id]);
      
      // Insert new shipment details
      if (invoice.shipmentDetails.shippingAddress || invoice.shipmentDetails.trackingNumber || invoice.shipmentDetails.carrierName) {
        await db.run(`
          INSERT INTO shipment_details (invoiceId, shipDate, trackingNumber, carrierName, shippingAddress)
          VALUES (?, ?, ?, ?, ?)
        `, [
          invoice.id,
          invoice.shipmentDetails.shipDate ? invoice.shipmentDetails.shipDate.toISOString() : null,
          invoice.shipmentDetails.trackingNumber || '',
          invoice.shipmentDetails.carrierName || '',
          invoice.shipmentDetails.shippingAddress || ''
        ]);
      }
    }
    
    // Commit the transaction
    await db.run('COMMIT');
    
    return true;
  } catch (error) {
    console.error('Error saving invoice:', error);
    // Rollback in case of error
    await db.run('ROLLBACK');
    return false;
  }
}

// Get invoice by id
export async function getInvoiceById(id: string): Promise<StoredInvoice | null> {
  try {
    await initDatabase();
    
    const invoice = await db.get(`
      SELECT * FROM invoices WHERE id = ?
    `, [id]);
    
    if (!invoice) return null;
    
    const items = await db.all(`
      SELECT * FROM invoice_items WHERE invoiceId = ?
    `, [id]);
    
    const shipmentDetails = await db.get(`
      SELECT * FROM shipment_details WHERE invoiceId = ?
    `, [id]);
    
    return {
      ...invoice,
      invoiceDate: new Date(invoice.invoiceDate),
      dueDate: new Date(invoice.dueDate),
      items: items.map(item => ({
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        gstCategory: item.gstCategory,
        gstType: item.gstType || "IGST",
        gstRate: item.gstRate || 18
      })),
      shipmentDetails: shipmentDetails ? {
        shipDate: shipmentDetails.shipDate ? new Date(shipmentDetails.shipDate) : null,
        trackingNumber: shipmentDetails.trackingNumber,
        carrierName: shipmentDetails.carrierName,
        shippingAddress: shipmentDetails.shippingAddress
      } : {
        shipDate: null,
        trackingNumber: "",
        carrierName: "",
        shippingAddress: ""
      }
    };
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return null;
  }
}

// Delete invoice
export async function deleteInvoice(id: string): Promise<boolean> {
  try {
    await initDatabase();
    
    await db.run('BEGIN TRANSACTION');
    
    // Delete shipment details
    await db.run(`DELETE FROM shipment_details WHERE invoiceId = ?`, [id]);
    
    // Delete items
    await db.run(`DELETE FROM invoice_items WHERE invoiceId = ?`, [id]);
    
    // Delete the invoice
    await db.run(`DELETE FROM invoices WHERE id = ?`, [id]);
    
    await db.run('COMMIT');
    
    return true;
  } catch (error) {
    console.error('Error deleting invoice:', error);
    await db.run('ROLLBACK');
    return false;
  }
}

// Save company information
export async function saveCompanyInfo(company: {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  bank_name: string;
  bank_account: string;
  bank_ifsc: string;
}): Promise<boolean> {
  try {
    await initDatabase();
    
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
    return false;
  }
}

export async function getCompanyInfo() {
  try {
    await initDatabase();
    
    const company = await db.get(`
      SELECT * FROM company WHERE id = 1
    `);
    
    return company || null;
  } catch (error) {
    console.error('Error fetching company info:', error);
    return null;
  }
}

// Save customer to database
export async function saveCustomer(customer: {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}): Promise<boolean> {
  try {
    await initDatabase();
    
    await db.run(`
      INSERT OR REPLACE INTO customers (id, name, email, phone, address)
      VALUES (?, ?, ?, ?, ?)
    `, [
      customer.id,
      customer.name,
      customer.email,
      customer.phone,
      customer.address
    ]);
    
    return true;
  } catch (error) {
    console.error('Error saving customer:', error);
    return false;
  }
}

// Get all customers
export async function getAllCustomers() {
  try {
    await initDatabase();
    
    const customers = await db.all(`
      SELECT * FROM customers ORDER BY name
    `);
    
    return customers;
  } catch (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
}

// Save product to database
export async function saveProduct(product: {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  gstCategory: string;
  gstType: string;
  gstRate: number;
}): Promise<boolean> {
  try {
    await initDatabase();
    
    await db.run(`
      INSERT OR REPLACE INTO products (id, name, description, price, imageUrl, gstCategory, gstType, gstRate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      product.id,
      product.name,
      product.description,
      product.price,
      product.imageUrl,
      product.gstCategory,
      product.gstType,
      product.gstRate
    ]);
    
    return true;
  } catch (error) {
    console.error('Error saving product:', error);
    return false;
  }
}

// Get all products
export async function getAllProducts() {
  try {
    await initDatabase();
    
    const products = await db.all(`
      SELECT * FROM products ORDER BY name
    `);
    
    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
} 