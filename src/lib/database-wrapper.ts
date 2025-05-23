'use client';

import { StoredInvoice } from './database';
import * as ElectronDB from './database-electron';

// This wrapper module will automatically detect and use the appropriate database implementation
// based on whether we're in Electron or web environment

// Check if we're running in Electron
export const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

// Function to determine if we're running in a browser (client-side) or on the server
const isBrowser = () => typeof window !== 'undefined';

// Get all invoices
export async function getAllInvoices(): Promise<StoredInvoice[]> {
  if (isBrowser() && isElectron()) {
    // Use Electron's API when in Electron
    return await ElectronDB.getAllInvoices();
  } else {
    // Use server actions or other implementations in web environment
    try {
      // In browser but not Electron, fetch from API endpoint
      const response = await fetch('/api/invoices');
      if (!response.ok) throw new Error('Failed to fetch invoices');
      return await response.json();
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }
}

// Get invoice by id
export async function getInvoiceById(id: string): Promise<StoredInvoice | null> {
  if (isBrowser() && isElectron()) {
    return await ElectronDB.getInvoiceById(id);
  } else {
    try {
      const response = await fetch(`/api/invoices/${id}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch invoice');
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching invoice ${id}:`, error);
      return null;
    }
  }
}

// Save invoice
export async function saveInvoice(invoice: StoredInvoice): Promise<boolean> {
  if (isBrowser() && isElectron()) {
    return await ElectronDB.saveInvoice(invoice);
  } else {
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice),
      });
      if (!response.ok) throw new Error('Failed to save invoice');
      return true;
    } catch (error) {
      console.error('Error saving invoice:', error);
      return false;
    }
  }
}

// Delete invoice
export async function deleteInvoice(id: string): Promise<boolean> {
  if (isBrowser() && isElectron()) {
    return await ElectronDB.deleteInvoice(id);
  } else {
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete invoice');
      return true;
    } catch (error) {
      console.error(`Error deleting invoice ${id}:`, error);
      return false;
    }
  }
}

// Get company info
export async function getCompanyInfo() {
  if (isBrowser() && isElectron()) {
    return await ElectronDB.getCompanyInfo();
  } else {
    try {
      const response = await fetch('/api/company');
      if (!response.ok) throw new Error('Failed to fetch company info');
      return await response.json();
    } catch (error) {
      console.error('Error fetching company info:', error);
      return null;
    }
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
  if (isBrowser() && isElectron()) {
    return await ElectronDB.saveCompanyInfo(company);
  } else {
    try {
      const response = await fetch('/api/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company),
      });
      if (!response.ok) throw new Error('Failed to save company info');
      return true;
    } catch (error) {
      console.error('Error saving company info:', error);
      return false;
    }
  }
} 