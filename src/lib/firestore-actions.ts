
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
  const q = query(collection(db, INVOICES), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() } as StoredInvoice));
}

export async function getInvoice(id: string): Promise<StoredInvoice | null> {
  const docRef = doc(db, INVOICES, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return fromFirestore({ id: docSnap.id, ...docSnap.data() } as StoredInvoice);
  }
  return null;
}

export async function saveInvoice(invoiceData: Omit<StoredInvoice, 'id' | 'createdAt' | 'updatedAt'>, id?: string): Promise<string> {
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
  await deleteDoc(doc(db, INVOICES, id));
}

// Customer Actions
export async function getCustomers(): Promise<Customer[]> {
  const q = query(collection(db, CUSTOMERS), orderBy('name'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() } as Customer));
}

export async function addCustomer(customerData: Omit<Customer, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, CUSTOMERS), { 
        ...customerData, 
        createdAt: serverTimestamp()
    });
    return docRef.id;
}

export async function updateCustomer(id: string, customerData: Partial<Omit<Customer, 'id' | 'createdAt'>>): Promise<void> {
    await updateDoc(doc(db, CUSTOMERS, id), customerData);
}

export async function deleteCustomer(id: string): Promise<void> {
    await deleteDoc(doc(db, CUSTOMERS, id));
}

// Product Actions
export async function getProducts(): Promise<Product[]> {
    const q = query(collection(db, PRODUCTS), orderBy('name'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() } as Product));
}

export async function addProduct(productData: Omit<Product, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, PRODUCTS), {
        ...productData,
        createdAt: serverTimestamp()
    });
    return docRef.id;
}

export async function updateProduct(id: string, productData: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<void> {
    await updateDoc(doc(db, PRODUCTS, id), productData);
}

export async function deleteProduct(id: string): Promise<void> {
    await deleteDoc(doc(db, PRODUCTS, id));
}

// Company Info Actions
export async function getCompanyInfo(): Promise<CompanyData | null> {
  const docRef = doc(db, COMPANY, 'main');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as CompanyData;
  }
  return null;
}

export async function saveCompanyInfo(companyData: Omit<CompanyData, 'id'>): Promise<void> {
  await setDoc(doc(db, COMPANY, 'main'), companyData, { merge: true });
}

// User role management (Simplified - a full system would use Cloud Functions)
export async function getUserRole(uid: string): Promise<User | null> {
    const userDocRef = doc(db, USERS, uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        return userDocSnap.data() as User;
    }
    // If user doesn't exist in 'users' collection, create them with 'user' role.
    // This is a fallback for users created directly in Firebase Auth console.
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

export async function clearAllData(): Promise<void> {
    await Promise.all([
        clearAllCustomers(),
        clearAllProducts(),
        clearAllInvoices(),
        // Company info is a single doc, so we delete it separately
        deleteDoc(doc(db, COMPANY, 'main')).catch(() => {}) // Ignore error if it doesn't exist
    ]);
}
