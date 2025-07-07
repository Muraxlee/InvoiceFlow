
import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import type { StoredInvoice, CompanyData, Customer, Product, User } from '@/types/database';

const INVOICES = 'invoices';
const CUSTOMERS = 'customers';
const PRODUCTS = 'products';
const COMPANY = 'company';
const USERS = 'users';

const checkDb = () => {
    if (!db) {
        throw new Error("Firestore is not initialized. Please check your Firebase configuration.");
    }
}

// Helper to convert Firestore Timestamps to Dates
const fromFirestore = <T extends { [key: string]: any }>(docData: T): T => {
    const data = { ...docData };
    for (const key in data) {
        if (data[key]?.toDate && typeof data[key].toDate === 'function') {
            data[key] = data[key].toDate();
        }
    }
    return data;
};

// Invoice Actions
export async function getInvoices(): Promise<StoredInvoice[]> {
  checkDb();
  const q = query(collection(db, INVOICES), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() } as StoredInvoice));
}

export async function getInvoice(id: string): Promise<StoredInvoice | null> {
  checkDb();
  const docRef = doc(db, INVOICES, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return fromFirestore({ id: docSnap.id, ...docSnap.data() } as StoredInvoice);
  }
  return null;
}

export async function saveInvoice(invoiceData: Omit<StoredInvoice, 'id' | 'createdAt' | 'updatedAt'>, id?: string): Promise<string> {
  checkDb();
  if (id) {
    const docRef = doc(db, INVOICES, id);
    await setDoc(docRef, { ...invoiceData, updatedAt: serverTimestamp() }, { merge: true });
    return id;
  } else {
    const docRef = await addDoc(collection(db, INVOICES), { 
        ...invoiceData, 
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp() 
    });
    return docRef.id;
  }
}

export async function deleteInvoice(id: string): Promise<void> {
  checkDb();
  await deleteDoc(doc(db, INVOICES, id));
}

// Customer Actions
export async function getCustomers(): Promise<Customer[]> {
  checkDb();
  const q = query(collection(db, CUSTOMERS), orderBy('name'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() } as Customer));
}

export async function addCustomer(customerData: Omit<Customer, 'id' | 'createdAt'>): Promise<string> {
    checkDb();
    const docRef = await addDoc(collection(db, CUSTOMERS), { 
        ...customerData, 
        createdAt: serverTimestamp()
    });
    return docRef.id;
}

export async function updateCustomer(id: string, customerData: Partial<Omit<Customer, 'id' | 'createdAt'>>): Promise<void> {
    checkDb();
    await updateDoc(doc(db, CUSTOMERS, id), customerData);
}

export async function deleteCustomer(id: string): Promise<void> {
    checkDb();
    await deleteDoc(doc(db, CUSTOMERS, id));
}

// Product Actions
export async function getProducts(): Promise<Product[]> {
    checkDb();
    const q = query(collection(db, PRODUCTS), orderBy('name'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() } as Product));
}

export async function addProduct(productData: Omit<Product, 'id' | 'createdAt'>): Promise<string> {
    checkDb();
    const docRef = await addDoc(collection(db, PRODUCTS), {
        ...productData,
        createdAt: serverTimestamp()
    });
    return docRef.id;
}

export async function updateProduct(id: string, productData: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<void> {
    checkDb();
    await updateDoc(doc(db, PRODUCTS, id), productData);
}

export async function deleteProduct(id: string): Promise<void> {
    checkDb();
    await deleteDoc(doc(db, PRODUCTS, id));
}

// Company Info Actions
export async function getCompanyInfo(): Promise<CompanyData | null> {
  checkDb();
  const docRef = doc(db, COMPANY, 'main');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as CompanyData;
  }
  return null;
}

export async function saveCompanyInfo(companyData: Omit<CompanyData, 'id'>): Promise<void> {
  checkDb();
  await setDoc(doc(db, COMPANY, 'main'), companyData, { merge: true });
}

// User role management (Simplified - a full system would use Cloud Functions)
export async function getUserRole(uid: string): Promise<User | null> {
    checkDb();
    const userDocRef = doc(db, USERS, uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        return userDocSnap.data() as User;
    }
    // If user doesn't exist in 'users' collection, create them with 'user' role.
    const fallbackUser: User = {
        uid,
        email: 'N/A',
        name: 'New User',
        role: 'user',
        isActive: true
    };
    await setDoc(userDocRef, fallbackUser);
    return fallbackUser;
}

// Batch delete helper
async function deleteCollection(collectionPath: string) {
    checkDb();
    const q = query(collection(db, collectionPath));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return;
    const batch = writeBatch(db!);
    querySnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();
}

export async function clearAllCustomers(): Promise<void> {
    await deleteCollection(CUSTOMERS);
}

export async function clearAllProducts(): Promise<void> {
    await deleteCollection(PRODUCTS);
}

export async function clearAllInvoices(): Promise<void> {
    await deleteCollection(INVOICES);
}

export async function clearAllData(): Promise<void> {
    checkDb();
    await Promise.all([
        clearAllCustomers(),
        clearAllProducts(),
        clearAllInvoices(),
        // Company info is a single doc, so we delete it separately
        deleteDoc(doc(db!, COMPANY, 'main')).catch(() => {}) // Ignore error if it doesn't exist
    ]);
}

export async function seedSampleData(): Promise<void> {
    checkDb();
    const batch = writeBatch(db!);

    // 1. Sample Customers with predictable IDs
    const customersData = [
        { id: "sample-customer-1", data: { name: "Acme Innovations", email: "contact@acmeinnovations.com", phone: "555-0101", address: "123 Innovation Dr, Tech City, 11001", gstin: "29AABCU9567M1Z5", state: "Karnataka", stateCode: "29" }},
        { id: "sample-customer-2", data: { name: "Quantum Solutions", email: "support@quantum.com", phone: "555-0102", address: "456 Quantum Way, Silicon Valley, 94043", gstin: "33ALMPA7890B2Z6", state: "Tamil Nadu", stateCode: "33" }},
    ];
    customersData.forEach(c => {
        const ref = doc(db!, CUSTOMERS, c.id);
        batch.set(ref, { ...c.data, createdAt: serverTimestamp() });
    });

    // 2. Sample Products with predictable IDs
    const productsData = [
        { id: "sample-product-1", data: { name: "Pro-Grade Website Development", description: "10-page responsive website", price: 50000, hsn: "998314", igstRate: 18, cgstRate: 9, sgstRate: 9 }},
        { id: "sample-product-2", data: { name: "Cloud Hosting - 1 Year", description: "Standard cloud hosting package", price: 12000, hsn: "998315", igstRate: 18, cgstRate: 9, sgstRate: 9 }},
        { id: "sample-product-3", data: { name: "Monthly SEO Service", description: "Monthly SEO and analytics report", price: 25000, hsn: "998313", igstRate: 18, cgstRate: 9, sgstRate: 9 }},
    ];
    productsData.forEach(p => {
        const ref = doc(db!, PRODUCTS, p.id);
        batch.set(ref, { ...p.data, createdAt: serverTimestamp() });
    });

    // 3. Sample Invoice using the first customer and first two products
    const sampleInvoiceItems = [
        { productId: productsData[0].id, productName: productsData[0].data.name, quantity: 1, price: productsData[0].data.price, gstCategory: productsData[0].data.hsn, applyIgst: false, applyCgst: true, applySgst: true, igstRate: 18, cgstRate: 9, sgstRate: 9 },
        { productId: productsData[1].id, productName: productsData[1].data.name, quantity: 1, price: productsData[1].data.price, gstCategory: productsData[1].data.hsn, applyIgst: false, applyCgst: true, applySgst: true, igstRate: 18, cgstRate: 9, sgstRate: 9 },
    ];
    const subtotal = sampleInvoiceItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
    const tax = subtotal * 0.18; // simplified 9% + 9%
    const total = subtotal + tax;

    const sampleInvoiceData = {
        invoiceNumber: "SMPL-001",
        invoiceDate: new Date(),
        dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
        customerId: customersData[0].id,
        customerName: customersData[0].data.name,
        customerEmail: customersData[0].data.email,
        customerAddress: customersData[0].data.address,
        customerGstin: customersData[0].data.gstin,
        customerState: customersData[0].data.state,
        customerStateCode: customersData[0].data.stateCode,
        items: sampleInvoiceItems,
        amount: Math.round(total),
        status: "Pending",
        notes: "Thank you for your business! This is a sample invoice.",
        termsAndConditions: "Payment due within 30 days.",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        paymentStatus: "Unpaid",
        roundOffApplied: true,
    };
    const invoiceRef = doc(db!, INVOICES, 'sample-invoice-1');
    batch.set(invoiceRef, sampleInvoiceData as any); // Cast to any to handle serverTimestamp and dates

    await batch.commit();
}
