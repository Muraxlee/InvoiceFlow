'use client';

import { StoredInvoice } from './database';

// Check if running in Electron
export const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

// Get all invoices
export async function getAllInvoices(): Promise<StoredInvoice[]> {
  if (!isElectron()) {
    console.error('Electron API not available');
    return [];
  }
  
  try {
    const invoices = await window.electronAPI.getAllInvoices();
    return invoices;
  } catch (error) {
    console.error('Error getting invoices from Electron:', error);
    return [];
  }
}

// Get invoice by ID
export async function getInvoiceById(id: string): Promise<StoredInvoice | null> {
  if (!isElectron()) {
    console.error('Electron API not available');
    return null;
  }
  
  try {
    return await window.electronAPI.getInvoiceById(id);
  } catch (error) {
    console.error('Error getting invoice from Electron:', error);
    return null;
  }
}

// Save invoice
export async function saveInvoice(invoice: StoredInvoice): Promise<boolean> {
  if (!isElectron()) {
    console.error('Electron API not available');
    return false;
  }
  
  try {
    // Convert Date objects to ISO strings for IPC
    const serializedInvoice = {
      ...invoice,
      invoiceDate: invoice.invoiceDate.toISOString(),
      dueDate: invoice.dueDate.toISOString()
    };
    
    return await window.electronAPI.saveInvoice(serializedInvoice);
  } catch (error) {
    console.error('Error saving invoice with Electron:', error);
    return false;
  }
}

// Delete invoice
export async function deleteInvoice(id: string): Promise<boolean> {
  if (!isElectron()) {
    console.error('Electron API not available');
    return false;
  }
  
  try {
    return await window.electronAPI.deleteInvoice(id);
  } catch (error) {
    console.error('Error deleting invoice with Electron:', error);
    return false;
  }
}

// Get company info
export async function getCompanyInfo() {
  if (!isElectron()) {
    console.error('Electron API not available');
    return null;
  }
  
  try {
    return await window.electronAPI.getCompanyInfo();
  } catch (error) {
    console.error('Error getting company info from Electron:', error);
    return null;
  }
}

// Save company info
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
  if (!isElectron()) {
    console.error('Electron API not available');
    return false;
  }
  
  try {
    return await window.electronAPI.saveCompanyInfo(company);
  } catch (error) {
    console.error('Error saving company info with Electron:', error);
    return false;
  }
} 