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
import type { StoredInvoice, CompanyData, Customer, Product, User, Measurement } from '@/types/database';
import { loadFromLocalStorage, saveToLocalStorage, CUSTOMERS_STORAGE_KEY, PRODUCTS_STORAGE_KEY, INVOICES_STORAGE_KEY, MEASUREMENTS_STORAGE_KEY } from './localStorage';

const INVOICES = 'invoices';
const CUSTOMERS = 'customers';
const PRODUCTS = 'products';
const MEASUREMENTS = 'measurements';
const COMPANY = 'company';
const USERS = 'users';

const checkDb = () => {
    if (!db) {
        throw new Error("Firestore is not initialized. Please check your Firebase configuration.");
    }
}

// Helper to convert Firestore Timestamps to Dates, now recursive
const fromFirestore = <T extends { [key: string]: any }>(data: T): T => {
  if (!data || typeof data !== 'object') return data;

  const newData: { [key: string]: any } = Array.isArray(data) ? [] : {};

  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      if (value && typeof value.toDate === 'function') {
        newData[key] = value.toDate();
      } else if (value && typeof value === 'object') {
        newData[key] = fromFirestore(value); // Recursively call for nested objects and arrays
      } else {
        newData[key] = value;
      }
    }
  }
  return newData as T;
};

// Generic get with caching
async function getCollectionWithCache<T extends {id: string}>(collectionPath: string, storageKey: string, orderByField: string, orderDirection: 'asc' | 'desc' = 'asc'): Promise<T[]> {
    checkDb();
    
    // Immediately return from cache if available
    const cachedData = loadFromLocalStorage<T[] | null>(storageKey, null);
    
    // Fetch from Firestore in the background
    const q = query(collection(db, collectionPath), orderBy(orderByField, orderDirection));
    getDocs(q).then(querySnapshot => {
        const firestoreData = querySnapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() } as T));
        saveToLocalStorage(storageKey, firestoreData);
    }).catch(error => {
        console.error(`Error fetching ${collectionPath} in background:`, error);
    });

    return cachedData || [];
}

// Invoice Actions
export async function getInvoices(): Promise<StoredInvoice[]> {
  return getCollectionWithCache<StoredInvoice>(INVOICES, INVOICES_STORAGE_KEY, 'createdAt', 'desc');
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
  let docId: string;
  if (id) {
    const docRef = doc(db, INVOICES, id);
    await setDoc(docRef, { ...invoiceData, updatedAt: serverTimestamp() }, { merge: true });
    docId = id;
  } else {
    const docRef = await addDoc(collection(db, INVOICES), { 
        ...invoiceData, 
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp() 
    });
    docId = docRef.id;
  }
  localStorage.removeItem(INVOICES_STORAGE_KEY);
  return docId;
}

export async function deleteInvoice(id: string): Promise<void> {
  checkDb();
  await deleteDoc(doc(db, INVOICES, id));
  localStorage.removeItem(INVOICES_STORAGE_KEY);
}

// Customer Actions
export async function getCustomers(): Promise<Customer[]> {
  return getCollectionWithCache<Customer>(CUSTOMERS, CUSTOMERS_STORAGE_KEY, 'name');
}

export async function addCustomer(customerData: Omit<Customer, 'id' | 'createdAt'>): Promise<string> {
    checkDb();
    const docRef = await addDoc(collection(db, CUSTOMERS), { 
        ...customerData, 
        createdAt: serverTimestamp()
    });
    localStorage.removeItem(CUSTOMERS_STORAGE_KEY);
    return docRef.id;
}

export async function updateCustomer(id: string, customerData: Partial<Omit<Customer, 'id' | 'createdAt'>>): Promise<void> {
    checkDb();
    await updateDoc(doc(db, CUSTOMERS, id), customerData);
    localStorage.removeItem(CUSTOMERS_STORAGE_KEY);
}

export async function deleteCustomer(id: string): Promise<void> {
    checkDb();
    await deleteDoc(doc(db, CUSTOMERS, id));
    localStorage.removeItem(CUSTOMERS_STORAGE_KEY);
}

// Product Actions
export async function getProducts(): Promise<Product[]> {
    return getCollectionWithCache<Product>(PRODUCTS, PRODUCTS_STORAGE_KEY, 'name');
}

export async function addProduct(productData: Omit<Product, 'id' | 'createdAt'>): Promise<string> {
    checkDb();
    const docRef = await addDoc(collection(db, PRODUCTS), {
        ...productData,
        createdAt: serverTimestamp()
    });
    localStorage.removeItem(PRODUCTS_STORAGE_KEY);
    return docRef.id;
}

export async function updateProduct(id: string, productData: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<void> {
    checkDb();
    await updateDoc(doc(db, PRODUCTS, id), productData);
    localStorage.removeItem(PRODUCTS_STORAGE_KEY);
}

export async function deleteProduct(id: string): Promise<void> {
    checkDb();
    await deleteDoc(doc(db, PRODUCTS, id));
    localStorage.removeItem(PRODUCTS_STORAGE_KEY);
}

// Measurement Actions
export async function getMeasurements(): Promise<Measurement[]> {
  return getCollectionWithCache<Measurement>(MEASUREMENTS, MEASUREMENTS_STORAGE_KEY, 'recordedDate', 'desc');
}

export async function getMeasurement(id: string): Promise<Measurement | null> {
  checkDb();
  const docRef = doc(db, MEASUREMENTS, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return fromFirestore({ id: docSnap.id, ...docSnap.data() } as Measurement);
  }
  return null;
}

export async function addMeasurement(measurementData: Omit<Measurement, 'id' | 'createdAt'>): Promise<string> {
  checkDb();
  const docRef = await addDoc(collection(db, MEASUREMENTS), {
    ...measurementData,
    createdAt: serverTimestamp()
  });
  localStorage.removeItem(MEASUREMENTS_STORAGE_KEY);
  return docRef.id;
}

export async function updateMeasurement(id: string, measurementData: Partial<Omit<Measurement, 'id' | 'createdAt'>>): Promise<void> {
  checkDb();
  await updateDoc(doc(db, MEASUREMENTS, id), measurementData);
  localStorage.removeItem(MEASUREMENTS_STORAGE_KEY);
}

export async function deleteMeasurement(id: string): Promise<void> {
  checkDb();
  await deleteDoc(doc(db, MEASUREMENTS, id));
  localStorage.removeItem(MEASUREMENTS_STORAGE_KEY);
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
    localStorage.removeItem(CUSTOMERS_STORAGE_KEY);
}

export async function clearAllProducts(): Promise<void> {
    await deleteCollection(PRODUCTS);
    localStorage.removeItem(PRODUCTS_STORAGE_KEY);
}

export async function clearAllInvoices(): Promise<void> {
    await deleteCollection(INVOICES);
    localStorage.removeItem(INVOICES_STORAGE_KEY);
}

export async function clearAllData(): Promise<void> {
    checkDb();
    await Promise.all([
        clearAllCustomers(),
        clearAllProducts(),
        clearAllInvoices(),
        deleteCollection(MEASUREMENTS),
        // Company info is a single doc, so we delete it separately
        deleteDoc(doc(db!, COMPANY, 'main')).catch(() => {}) // Ignore error if it doesn't exist
    ]);
    localStorage.removeItem(MEASUREMENTS_STORAGE_KEY);
}

export async function seedSampleData(): Promise<void> {
    checkDb();
    const batch = writeBatch(db!);

    // 1. Sample Customer with a predictable ID
    const customerData = { id: "sample-customer-1", data: { name: "Acme Innovations", email: "contact@acmeinnovations.com", phone: "555-0101", address: "123 Innovation Dr, Tech City, 11001", gstin: "29AABCU9567M1Z5", state: "Karnataka", stateCode: "29" }};
    const customerRef = doc(db!, CUSTOMERS, customerData.id);
    batch.set(customerRef, { ...customerData.data, createdAt: serverTimestamp() });

    // 2. Sample Product with a predictable ID
    const productData = { id: "sample-product-1", data: { name: "Pro-Grade Website Development", description: "10-page responsive website", price: 50000, hsn: "998314", igstRate: 18, cgstRate: 9, sgstRate: 9 }};
    const productRef = doc(db!, PRODUCTS, productData.id);
    batch.set(productRef, { ...productData.data, createdAt: serverTimestamp() });

    // 3. Sample Invoice using the customer and product
    const sampleInvoiceItems = [
        { productId: productData.id, productName: productData.data.name, quantity: 1, price: productData.data.price, gstCategory: productData.data.hsn, applyIgst: false, applyCgst: true, applySgst: true, igstRate: 18, cgstRate: 9, sgstRate: 9 },
    ];
    const subtotal = sampleInvoiceItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
    const tax = subtotal * 0.18; // simplified 9% + 9%
    const total = subtotal + tax;

    const sampleInvoiceData = {
        invoiceNumber: "SMPL-001",
        invoiceDate: new Date(),
        dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
        customerId: customerData.id,
        customerName: customerData.data.name,
        customerEmail: customerData.data.email,
        customerPhone: customerData.data.phone,
        customerAddress: customerData.data.address,
        customerGstin: customerData.data.gstin,
        customerState: customerData.data.state,
        customerStateCode: customerData.data.stateCode,
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

    // Invalidate local cache after seeding
    localStorage.removeItem(CUSTOMERS_STORAGE_KEY);
    localStorage.removeItem(PRODUCTS_STORAGE_KEY);
    localStorage.removeItem(INVOICES_STORAGE_KEY);
}
