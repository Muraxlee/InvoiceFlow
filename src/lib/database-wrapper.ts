
'use client';

import { StoredInvoice, CompanyData } from './database'; // Ensure CompanyData is imported
import * as ElectronDB from './database-electron'; // Assuming this exposes updated function signatures

// This wrapper module will automatically detect and use the appropriate database implementation
// based on whether we're in Electron or web environment

export const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

const isBrowser = () => typeof window !== 'undefined';

export async function getAllInvoices(): Promise<StoredInvoice[]> {
  if (isBrowser() && isElectron()) {
    return await ElectronDB.getAllInvoices();
  } else {
    try {
      const response = await fetch('/api/invoices');
      if (!response.ok) throw new Error('Failed to fetch invoices');
      const invoices = await response.json();
      return invoices.map((inv: any) => ({
        ...inv,
        invoiceDate: new Date(inv.invoiceDate),
        dueDate: new Date(inv.dueDate),
        items: inv.items.map((item:any) => ({
            ...item,
            igstRate: Number(item.igstRate ?? 18),
            cgstRate: Number(item.cgstRate ?? 9),
            sgstRate: Number(item.sgstRate ?? 9),
        })),
        shipmentDetails: inv.shipmentDetails ? {
          ...inv.shipmentDetails,
          shipDate: inv.shipmentDetails.shipDate ? new Date(inv.shipmentDetails.shipDate) : null,
          dateOfSupply: inv.shipmentDetails.dateOfSupply ? new Date(inv.shipmentDetails.dateOfSupply) : null,
        } : { shipDate: null, trackingNumber: "", carrierName: "", consigneeName: "", consigneeAddress: "", consigneeGstin: "", consigneeStateCode: "", transportationMode: "", lrNo: "", vehicleNo: "", dateOfSupply: null, placeOfSupply: "" }
      }));
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }
}

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
          dateOfSupply: invoice.shipmentDetails.dateOfSupply ? new Date(invoice.shipmentDetails.dateOfSupply) : null,
        } : { shipDate: null, trackingNumber: "", carrierName: "", consigneeName: "", consigneeAddress: "", consigneeGstin: "", consigneeStateCode: "", transportationMode: "", lrNo: "", vehicleNo: "", dateOfSupply: null, placeOfSupply: "" }
      };
    } catch (error) {
      console.error(`Error fetching invoice ${id}:`, error);
      return null;
    }
  }
}

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

export async function getCompanyInfo(): Promise<CompanyData | null> {
  if (isBrowser() && isElectron()) {
    return await ElectronDB.getCompanyInfo();
  } else {
    try {
      const response = await fetch('/api/company');
      if (!response.ok) {
        if (response.status === 404) {
          return null; 
        }
        throw new Error(`Failed to fetch company info, API responded with status: ${response.status}`);
      }
      const companyData = await response.json();
      if (companyData && Object.keys(companyData).length === 0 && companyData.constructor === Object) {
        return null;
      }
      return companyData;
    } catch (error) {
      console.error('Error fetching company info in wrapper:', error); 
      return null;
    }
  }
}

export async function saveCompanyInfo(company: CompanyData): Promise<boolean> {
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
