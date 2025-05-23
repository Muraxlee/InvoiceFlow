
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
      const invoices = await response.json();
      // Ensure dates are converted from ISO strings if necessary
      return invoices.map((inv: any) => ({
        ...inv,
        invoiceDate: new Date(inv.invoiceDate),
        dueDate: new Date(inv.dueDate),
        items: inv.items.map((item:any) => ({
            ...item,
            // Ensure rates are numbers, default if not present
            igstRate: Number(item.igstRate ?? product?.igstRate ?? 18),
            cgstRate: Number(item.cgstRate ?? product?.cgstRate ?? 9),
            sgstRate: Number(item.sgstRate ?? product?.sgstRate ?? 9),
        })),
        shipmentDetails: inv.shipmentDetails ? {
          ...inv.shipmentDetails,
          shipDate: inv.shipmentDetails.shipDate ? new Date(inv.shipmentDetails.shipDate) : null,
        } : { shipDate: null, trackingNumber: "", carrierName: "", shippingAddress: "" }
      }));
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
      const invoice = await response.json();
      if (!invoice) return null;
      // Ensure dates are converted
      return {
        ...invoice,
        invoiceDate: new Date(invoice.invoiceDate),
        dueDate: new Date(invoice.dueDate),
        items: invoice.items.map((item:any) => ({
            ...item,
            igstRate: Number(item.igstRate ?? 18),
            cgstRate: Number(item.cgstRate ?? 9),
            sgstRate: Number(item.sgstRate ?? 9),
        })),
        shipmentDetails: invoice.shipmentDetails ? {
          ...invoice.shipmentDetails,
          shipDate: invoice.shipmentDetails.shipDate ? new Date(invoice.shipmentDetails.shipDate) : null,
        } : { shipDate: null, trackingNumber: "", carrierName: "", shippingAddress: "" }
      };
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
      if (!response.ok) {
        if (response.status === 404) {
          // Company info not found, return null without logging an error
          return null; 
        }
        // For other errors (500, network issues etc.), throw the error.
        throw new Error(`Failed to fetch company info, API responded with status: ${response.status}`);
      }
      const companyData = await response.json();
      // If API returns an empty object for a 200, treat as null
      if (companyData && Object.keys(companyData).length === 0 && companyData.constructor === Object) {
        return null;
      }
      return companyData;
    } catch (error) {
      // This catch block will now only log errors not related to 404.
      console.error('Error fetching company info in wrapper:', error); 
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
