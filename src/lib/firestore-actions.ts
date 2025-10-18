
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
  where,
} from 'firebase/firestore';
import type { StoredInvoice, CompanyData, Customer, Product, User, Measurement, InventoryItem, Employee, Task, PurchaseInvoice } from '@/types/database';

const INVOICES = 'invoices';
const CUSTOMERS = 'customers';
const PRODUCTS = 'products';
const MEASUREMENTS = 'measurements';
const COMPANY = 'company';
const USERS = 'users';
const INVENTORY = 'inventory';
const EMPLOYEES = 'employees';
const TASKS = 'tasks';
const PURCHASES = 'purchases';


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

// Generic get function
async function getCollection<T extends {id: string}>(collectionPath: string, orderByField: string, orderDirection: 'asc' | 'desc' = 'asc'): Promise<T[]> {
    checkDb();
    const q = query(collection(db, collectionPath), orderBy(orderByField, orderDirection));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() } as T));
}

// Invoice Actions
export async function getInvoices(): Promise<StoredInvoice[]> {
  return getCollection<StoredInvoice>(INVOICES, 'createdAt', 'desc');
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
  return docId;
}

export async function updateInvoiceStatus(id: string, status: StoredInvoice['status']): Promise<void> {
  checkDb();
  await updateDoc(doc(db, INVOICES, id), { status, updatedAt: serverTimestamp() });
}

export async function deleteInvoice(id: string): Promise<void> {
  checkDb();
  await deleteDoc(doc(db, INVOICES, id));
}

// Purchase Invoice Actions
export async function getPurchaseInvoices(): Promise<PurchaseInvoice[]> {
  return getCollection<PurchaseInvoice>(PURCHASES, 'date', 'desc');
}

export async function getPurchaseInvoice(id: string): Promise<PurchaseInvoice | null> {
    checkDb();
    const docRef = doc(db, PURCHASES, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return fromFirestore({ id: docSnap.id, ...docSnap.data() } as PurchaseInvoice);
    }
    return null;
}

export async function addPurchaseInvoice(invoiceData: Omit<PurchaseInvoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    checkDb();
    const docRef = await addDoc(collection(db, PURCHASES), {
        ...invoiceData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    return docRef.id;
}

export async function updatePurchaseInvoice(id: string, invoiceData: Partial<Omit<PurchaseInvoice, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    checkDb();
    await updateDoc(doc(db, PURCHASES, id), { ...invoiceData, updatedAt: serverTimestamp() });
}

export async function updatePurchaseInvoiceStatus(id: string, status: PurchaseInvoice['status']): Promise<void> {
  checkDb();
  await updateDoc(doc(db, PURCHASES, id), { status, updatedAt: serverTimestamp() });
}


export async function deletePurchaseInvoice(id: string): Promise<void> {
    checkDb();
    await deleteDoc(doc(db, PURCHASES, id));
}

// Customer Actions
export async function getCustomers(): Promise<Customer[]> {
  return getCollection<Customer>(CUSTOMERS, 'name');
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
    return getCollection<Product>(PRODUCTS, 'name');
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

// Measurement Actions
export async function getMeasurements(): Promise<Measurement[]> {
  return getCollection<Measurement>(MEASUREMENTS, 'recordedDate', 'desc');
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
  return docRef.id;
}

export async function updateMeasurement(id: string, measurementData: Partial<Omit<Measurement, 'id' | 'createdAt'>>): Promise<void> {
  checkDb();
  await updateDoc(doc(db, MEASUREMENTS, id), measurementData);
}

export async function deleteMeasurement(id: string): Promise<void> {
  checkDb();
  await deleteDoc(doc(db, MEASUREMENTS, id));
}

// Inventory Actions
export async function getInventoryItems(): Promise<InventoryItem[]> {
  return getCollection<InventoryItem>(INVENTORY, 'productName');
}

export async function addInventoryItem(itemData: Omit<InventoryItem, 'id' | 'updatedAt'>): Promise<string> {
    checkDb();
    // Check if an inventory item for this product already exists
    const q = query(collection(db, INVENTORY), where("productId", "==", itemData.productId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error("Inventory item for this product already exists. Please edit the existing item.");
    }
    
    const docRef = await addDoc(collection(db, INVENTORY), {
        ...itemData,
        updatedAt: serverTimestamp()
    });
    return docRef.id;
}

export async function updateInventoryItem(id: string, itemData: Partial<Omit<InventoryItem, 'id'>>): Promise<void> {
    checkDb();
    await updateDoc(doc(db, INVENTORY, id), { ...itemData, updatedAt: serverTimestamp() });
}

export async function deleteInventoryItem(id: string): Promise<void> {
    checkDb();
    await deleteDoc(doc(db, INVENTORY, id));
}

// Employee Actions
export async function getEmployees(): Promise<Employee[]> {
  return getCollection<Employee>(EMPLOYEES, 'name');
}

export async function addEmployee(employeeData: Omit<Employee, 'id' | 'createdAt'>): Promise<string> {
  checkDb();
  const docRef = await addDoc(collection(db, EMPLOYEES), { ...employeeData, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function updateEmployee(id: string, employeeData: Partial<Omit<Employee, 'id' | 'createdAt'>>): Promise<void> {
  checkDb();
  await updateDoc(doc(db, EMPLOYEES, id), employeeData);
}

export async function deleteEmployee(id: string): Promise<void> {
  checkDb();
  await deleteDoc(doc(db, EMPLOYEES, id));
  // Optional: Also delete associated tasks
  const tasksQuery = query(collection(db, TASKS), where("employeeId", "==", id));
  const tasksSnapshot = await getDocs(tasksQuery);
  const batch = writeBatch(db);
  tasksSnapshot.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

// Task Actions
export async function getTasks(): Promise<Task[]> {
    return getCollection<Task>(TASKS, 'dueDate', 'asc');
}

export async function getTasksForEmployee(employeeId: string): Promise<Task[]> {
  checkDb();
  const q = query(collection(db, TASKS), where("employeeId", "==", employeeId), orderBy('dueDate', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() } as Task));
}

export async function addTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  checkDb();
  const docRef = await addDoc(collection(db, TASKS), {
    ...taskData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}

export async function updateTask(id: string, taskData: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<void> {
  checkDb();
  await updateDoc(doc(db, TASKS, id), { ...taskData, updatedAt: serverTimestamp() });
}

export async function deleteTask(id: string): Promise<void> {
  checkDb();
  await deleteDoc(doc(db, TASKS, id));
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
    if (!db) throw new Error("Firestore not initialized");
    const q = query(collection(db, collectionPath));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return;
    const batch = writeBatch(db);
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

export async function clearAllMeasurements(): Promise<void> {
    await deleteCollection(MEASUREMENTS);
}

export async function clearAllData(): Promise<void> {
    checkDb();
    if (!db) throw new Error("Firestore not initialized");
    await Promise.all([
        clearAllCustomers(),
        clearAllProducts(),
        clearAllInvoices(),
        clearAllMeasurements(),
        deleteCollection(PURCHASES),
        deleteDoc(doc(db, COMPANY, 'main')).catch(() => {}) // Ignore error if it doesn't exist
    ]);
}

export async function seedSampleData(): Promise<void> {
    checkDb();
    if (!db) throw new Error("Firestore not initialized");
    const batch = writeBatch(db);

    // 1. Sample Customer with a predictable ID
    const customerData = { id: "sample-customer-1", data: { name: "Acme Innovations", email: "contact@acmeinnovations.com", phone: "555-0101", address: "123 Innovation Dr, Tech City, 11001", gstin: "29AABCU9567M1Z5", state: "Karnataka", stateCode: "29" }};
    const customerRef = doc(db, CUSTOMERS, customerData.id);
    batch.set(customerRef, { ...customerData.data, createdAt: serverTimestamp() });

    // 2. Sample Product with a predictable ID
    const productData = { id: "sample-product-1", data: { name: "Pro-Grade Website Development", description: "10-page responsive website", price: 50000, hsn: "998314", igstRate: 18, cgstRate: 9, sgstRate: 9 }};
    const productRef = doc(db, PRODUCTS, productData.id);
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
    const invoiceRef = doc(db, INVOICES, 'sample-invoice-1');
    batch.set(invoiceRef, sampleInvoiceData as any); // Cast to any to handle serverTimestamp and dates

    await batch.commit();
}
