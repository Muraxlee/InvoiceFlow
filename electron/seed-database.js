const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const { hash } = require('bcrypt'); // bcrypt is needed if we were to seed users with passwords

// Define the database path (in the project root)
const dbPath = path.join(process.cwd(), 'invoiceflow.db');

async function seedDatabase() {
  console.log(`Attempting to connect to database at: ${dbPath}`);
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  console.log('Connected to the database.');

  try {
    await db.exec('BEGIN TRANSACTION');

    // 0. Clear existing data (optional, but good for a clean seed)
    console.log('Clearing existing business data...');
    await db.exec('DELETE FROM invoice_items;');
    await db.exec('DELETE FROM shipment_details;');
    await db.exec('DELETE FROM invoices;');
    await db.exec('DELETE FROM products;');
    await db.exec('DELETE FROM customers;');
    await db.exec('DELETE FROM company;');
    console.log('Existing business data cleared.');

    // 1. Seed Company Information
    console.log('Seeding company information...');
    await db.run(`
      INSERT INTO company (id, name, address, phone, phone2, email, gstin, bank_account_name, bank_name, bank_account, bank_ifsc)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'Innovatech Solutions Ltd.',
      '123 Tech Park, Silicon Alley, Mumbai, Maharashtra 400001',
      '+91 22 5555 0101',
      '+91 22 5555 0102', // Secondary phone
      'contact@innovatech.co.in',
      '27AAPCI1234A1Z5',
      'Innovatech Solutions Ltd.', // Account Holder Name
      'Global Commercial Bank',
      '001234567890123',
      'GCBL0000123'
    ]);
    console.log('Company information seeded.');

    // 2. Seed Customers
    console.log('Seeding customers...');
    const customers = [
      { id: 'CUST001', name: 'Alpha Dynamics', email: 'procurement@alphadyn.com', phone: '+91 80 5555 0202', address: '789 Industrial Estate, Bangalore, Karnataka 560001' },
      { id: 'CUST002', name: 'Beta Logistics Co.', email: 'info@betalogistics.com', phone: '+91 44 5555 0303', address: '456 Supply Chain Rd, Chennai, Tamil Nadu 600002' },
      { id: 'CUST003', name: 'Gamma Retail Inc.', email: 'orders@gammaretail.in', phone: '+91 11 5555 0404', address: '101 Market Street, New Delhi, Delhi 110001' },
    ];
    for (const cust of customers) {
      await db.run('INSERT INTO customers (id, name, email, phone, address) VALUES (?, ?, ?, ?, ?)', [cust.id, cust.name, cust.email, cust.phone, cust.address]);
    }
    console.log(`${customers.length} customers seeded.`);

    // 3. Seed Products
    console.log('Seeding products...');
    const products = [
      { id: 'PROD001', name: 'Quantum AI Processor', price: 75000.00, hsn: 'HSN 8471', igstRate: 18, cgstRate: 9, sgstRate: 9 },
      { id: 'PROD002', name: 'Cloud Data Storage - 1TB Plan', price: 5000.00, hsn: 'SAC 9983', igstRate: 18, cgstRate: 9, sgstRate: 9 },
      { id: 'PROD003', name: 'Cybersecurity Suite - Enterprise', price: 45000.00, hsn: 'HSN 8523', igstRate: 12, cgstRate: 6, sgstRate: 6 },
      { id: 'PROD004', name: 'Consulting Services - AI Implementation', price: 150000.00, hsn: 'SAC 998314', igstRate: 18, cgstRate: 9, sgstRate: 9 },
    ];
    for (const prod of products) {
      // Insert products with the simplified structure
      await db.run('INSERT INTO products (id, name, price, hsn, igstRate, cgstRate, sgstRate) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        [prod.id, prod.name, prod.price, prod.hsn, prod.igstRate, prod.cgstRate, prod.sgstRate]
      );
    }
    console.log(`${products.length} products seeded.`);

    // 4. Seed Invoices & Invoice Items
    console.log('Seeding invoices and items...');
    const invoices = [
      { 
        id: 'INV202405010001', invoiceNumber: 'INV202405010001', customerId: 'CUST001', customerName: 'Alpha Dynamics', customerEmail: 'procurement@alphadyn.com', customerAddress: '789 Industrial Estate, Bangalore, Karnataka 560001', 
        invoiceDate: new Date(2024, 4, 1).toISOString(), dueDate: new Date(2024, 4, 31).toISOString(), 
        notes: 'Initial project setup fee.', termsAndConditions: 'Payment due within 30 days.', 
        status: 'Paid', paymentStatus: 'Paid', paymentMethod: 'Bank Transfer',
        items: [
          { productId: 'PROD004', quantity: 1, price: 150000.00, description: 'Consulting Services - AI Implementation', gstCategory: 'SAC 998314', igstRate: 18 },
        ],
        shipmentDetails: { 
          shipDate: new Date(2024, 4, 2).toISOString(), trackingNumber: 'AWB7362876', carrierName: 'ProShip Logistics', 
          consigneeName: 'Alpha Dynamics Receiving', consigneeAddress: '789 Industrial Estate, Receiving Dock, Bangalore, Karnataka 560001',
          consigneeGstin: '29AAPCA1234B1Z0', consigneeStateCode: '29 - Karnataka', transportationMode: 'Road',
          lrNo: 'LR7890', vehicleNo: 'KA01AB1234', dateOfSupply: new Date(2024, 4, 1).toISOString(), placeOfSupply: 'Bangalore'
        }
      },
      { 
        id: 'INV202405150001', invoiceNumber: 'INV202405150001', customerId: 'CUST002', customerName: 'Beta Logistics Co.', customerEmail: 'info@betalogistics.com', customerAddress: '456 Supply Chain Rd, Chennai, Tamil Nadu 600002', 
        invoiceDate: new Date(2024, 4, 15).toISOString(), dueDate: new Date(2024, 5, 14).toISOString(), 
        notes: 'Hardware and software supply.', termsAndConditions: 'Net 30 days.', 
        status: 'Pending', paymentStatus: 'Unpaid', paymentMethod: '',
        items: [
          { productId: 'PROD001', quantity: 2, price: 75000.00, description: 'Quantum AI Processor', gstCategory: 'HSN 8471', igstRate: 18 },
          { productId: 'PROD003', quantity: 1, price: 45000.00, description: 'Cybersecurity Suite - Enterprise', gstCategory: 'HSN 8523', igstRate: 12 },
        ],
        shipmentDetails: {
          consigneeName: 'Beta Logistics Warehouse', consigneeAddress: '456 Supply Chain Rd, Goods Inward, Chennai, Tamil Nadu 600002',
          consigneeGstin: '33AABCB2345C1Z1', consigneeStateCode: '33 - Tamil Nadu', transportationMode: 'Sea',
          lrNo: 'BLCH001', vehicleNo: 'VESSEL002', dateOfSupply: new Date(2024, 4, 18).toISOString(), placeOfSupply: 'Chennai Port'
        }
      },
      { 
        id: 'INV202404200001', invoiceNumber: 'INV202404200001', customerId: 'CUST003', customerName: 'Gamma Retail Inc.', customerEmail: 'orders@gammaretail.in', customerAddress: '101 Market Street, New Delhi, Delhi 110001', 
        invoiceDate: new Date(2024, 3, 20).toISOString(), dueDate: new Date(2024, 4, 20).toISOString(), 
        notes: 'Monthly subscription for cloud services.', termsAndConditions: 'Auto-renewal unless cancelled.', 
        status: 'Paid', paymentStatus: 'Paid', paymentMethod: 'Credit Card',
        items: [
          { productId: 'PROD002', quantity: 5, price: 5000.00, description: 'Cloud Data Storage - 1TB Plan (5 units)', gstCategory: 'SAC 9983', igstRate: 18 },
        ],
        shipmentDetails: null // No shipment for this service invoice
      },
    ];

    for (const inv of invoices) {
      let totalAmount = 0;
      for (const item of inv.items) {
        const itemSubtotal = item.quantity * item.price;
        const taxRate = (item.igstRate || 0) / 100; // Assuming IGST for simplicity in seed
        totalAmount += itemSubtotal * (1 + taxRate);
      }

      await db.run(`
        INSERT INTO invoices (id, invoiceNumber, customerId, customerName, customerEmail, customerAddress, invoiceDate, dueDate, notes, termsAndConditions, status, amount, paymentStatus, paymentMethod) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
        [inv.id, inv.invoiceNumber, inv.customerId, inv.customerName, inv.customerEmail, inv.customerAddress, inv.invoiceDate, inv.dueDate, inv.notes, inv.termsAndConditions, inv.status, totalAmount, inv.paymentStatus, inv.paymentMethod]
      );

      for (const item of inv.items) {
        const productDetails = products.find(p => p.id === item.productId);
        await db.run(`
          INSERT INTO invoice_items (invoiceId, productId, quantity, price, igst, cgst, sgst) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`, 
          [inv.id, item.productId, item.quantity, item.price, 
           item.igstRate || productDetails?.igstRate || 0, 
           item.cgstRate || productDetails?.cgstRate || 0, 
           item.sgstRate || productDetails?.sgstRate || 0]
        );
      }

      if (inv.shipmentDetails) {
        await db.run(`
            INSERT INTO shipment_details (invoiceId, shipDate, trackingNumber, carrierName, consigneeName, consigneeAddress, consigneeGstin, consigneeStateCode, transportationMode, lrNo, vehicleNo, dateOfSupply, placeOfSupply)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            inv.id,
            inv.shipmentDetails.shipDate,
            inv.shipmentDetails.trackingNumber,
            inv.shipmentDetails.carrierName,
            inv.shipmentDetails.consigneeName,
            inv.shipmentDetails.consigneeAddress,
            inv.shipmentDetails.consigneeGstin,
            inv.shipmentDetails.consigneeStateCode,
            inv.shipmentDetails.transportationMode,
            inv.shipmentDetails.lrNo,
            inv.shipmentDetails.vehicleNo,
            inv.shipmentDetails.dateOfSupply,
            inv.shipmentDetails.placeOfSupply
        ]);
      }
    }
    console.log(`${invoices.length} invoices with items seeded.`);

    await db.exec('COMMIT');
    console.log('Database seeded successfully!');

  } catch (err) {
    await db.exec('ROLLBACK');
    console.error('Error seeding database:', err);
  } finally {
    await db.close();
    console.log('Database connection closed.');
  }
}

// Initialize database schema (from database.ts logic, simplified)
async function ensureSchema() {
  console.log(`Ensuring schema for database at: ${dbPath}`);
  const dbHandle = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  await dbHandle.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY, invoiceNumber TEXT UNIQUE, customerId TEXT, customerName TEXT, customerEmail TEXT, customerAddress TEXT, invoiceDate TEXT, dueDate TEXT, notes TEXT, termsAndConditions TEXT, status TEXT, amount REAL, paymentStatus TEXT, paymentMethod TEXT
    );
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, invoiceId TEXT, productId TEXT, quantity REAL, price REAL, igst REAL, cgst REAL, sgst REAL, FOREIGN KEY (invoiceId) REFERENCES invoices (id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS shipment_details (
      invoiceId TEXT PRIMARY KEY, shipDate TEXT, trackingNumber TEXT, carrierName TEXT, consigneeName TEXT, consigneeAddress TEXT, consigneeGstin TEXT, consigneeStateCode TEXT, transportationMode TEXT, lrNo TEXT, vehicleNo TEXT, dateOfSupply TEXT, placeOfSupply TEXT, FOREIGN KEY (invoiceId) REFERENCES invoices (id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS company (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, address TEXT, phone TEXT, phone2 TEXT, email TEXT, gstin TEXT, bank_account_name TEXT, bank_name TEXT, bank_account TEXT, bank_ifsc TEXT
    );
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT
    );
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, price REAL, hsn TEXT, igstRate REAL, cgstRate REAL, sgstRate REAL
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL, name TEXT, email TEXT, isActive INTEGER DEFAULT 1, isSystemAdmin INTEGER DEFAULT 0
    );
  `);

  const adminExists = await dbHandle.get('SELECT * FROM users WHERE username = ?', ['admin']);
  if (!adminExists) {
    const hashedPassword = await hash('admin123', 10); 
    await dbHandle.run(
      'INSERT INTO users (id, username, password, role, name, email, isActive, isSystemAdmin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [`user_admin_${Date.now()}`, 'admin', hashedPassword, 'admin', 'System Administrator', 'admin@invoiceflow.com', 1, 1]
    );
    console.log('Default admin user created by seed script.');
  }
  
  await dbHandle.close();
  console.log('Schema ensured.');
}


ensureSchema()
  .then(() => seedDatabase())
  .catch(err => {
    console.error("Failed to ensure schema or seed database:", err);
    process.exit(1);
  });
