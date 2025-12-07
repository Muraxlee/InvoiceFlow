
// This file serves as the single source of truth for our data models.
// It is safe to import from any component, client-side or server-side.

import type { InvoiceFormValues } from '@/components/invoice-form';

export interface User {
  uid: string;
  email: string | null;
  name: string | null;
  role: 'admin' | 'user';
  isActive: boolean;
}

export interface StoredInvoice extends InvoiceFormValues {
  id: string;
  status: "Paid" | "Pending" | "Overdue" | "Draft" | "Unpaid" | "Partially Paid";
  type: 'Tax Invoice' | 'Proforma Invoice' | 'Quotation';
  amount: number;
  dueDate: Date | null;
  roundOffApplied?: boolean;
  additionalCharges?: { description: string; amount: number }[];
  createdAt: any; // Firestore ServerTimestamp
  updatedAt: any; // Firestore ServerTimestamp
}

export interface PurchaseInvoice {
  id: string;
  invoiceId: string;
  vendor: string;
  date: any; // Firestore Timestamp
  dueDate?: any; // Firestore Timestamp
  amount: number;
  status: 'Paid' | 'Unpaid' | 'Pending' | 'Overdue';
  createdAt: any;
  updatedAt: any;
}


export interface Customer {
  id: string; 
  name: string; 
  email: string; 
  phone: string; 
  address: string;
  gstin?: string;
  state?: string;
  stateCode?: string;
  createdAt: any; // Firestore ServerTimestamp
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  hsn?: string;
  category?: string;
  subcategory?: string;
  igstRate: number;
  cgstRate: number;
  sgstRate: number;
  createdAt: any; // Firestore ServerTimestamp
}

export interface MeasurementValue {
  name: string; // e.g., 'Chest', 'Waist', 'Custom Field'
  value: number;
  unit: string; // e.g., 'in', 'cm'
}

export interface Measurement {
  id: string;
  uniqueId: string; // A user-friendly, unique ID
  customerId?: string; // Optional now
  customerName: string; // This is the primary identifier now
  type: string; // e.g., 'Shirt', 'Pant', 'Custom'
  customType?: string; // Only if type is 'Custom'
  values: MeasurementValue[];
  recordedDate: any; // Firestore Timestamp
  deliveryDate?: any; // Firestore Timestamp, optional
  notes?: string;
  createdAt: any; // Firestore ServerTimestamp
}

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string; // Denormalized for easier display
  stock: number;
  updatedAt: any; // Firestore ServerTimestamp
}

export interface Employee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  createdAt: any;
}

export interface Task {
    id: string;
    title: string;
    description?: string;
    employeeId: string;
    employeeName: string;
    dueDate: any; // Firestore Timestamp
    status: 'Todo' | 'In Progress' | 'Done';
    createdAt: any;
    updatedAt: any;
}


export interface CompanyData {
  id: string; // Document ID is 'main'
  name: string;
  address: string;
  phone: string;
  phone2?: string;
  email: string;
  gstin?: string;
  bank_account_name?: string;
  bank_name?: string;
  bank_account?: string;
  bank_ifsc?: string;
}
