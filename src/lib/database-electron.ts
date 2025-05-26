
'use client';

import type { StoredInvoice, CompanyData } from './database'; // Ensure CompanyData is imported

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
    // The data from Electron main process (via database-electron.js)
    // should already have dates as Date objects or null.
    return invoices.map(inv => ({
        ...inv,
        invoiceDate: new Date(inv.invoiceDate),
        dueDate: inv.dueDate ? new Date(inv.dueDate) : null,
        items: inv.items || [],
        shipmentDetails: inv.shipmentDetails ? {
            ...inv.shipmentDetails,
            shipDate: inv.shipmentDetails.shipDate ? new Date(inv.shipmentDetails.shipDate) : null,
            dateOfSupply: inv.shipmentDetails.dateOfSupply ? new Date(inv.shipmentDetails.dateOfSupply) : null,
        } : { 
            shipDate: null, trackingNumber: "", carrierName: "", consigneeName: "", consigneeAddress: "",
            consigneeGstin: "", consigneeStateCode: "", transportationMode: "", lrNo: "", vehicleNo: "",
            dateOfSupply: null, placeOfSupply: ""
        },
    }));
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
    const invoice = await window.electronAPI.getInvoiceById(id);
    if (!invoice) return null;
    return {
        ...invoice,
        invoiceDate: new Date(invoice.invoiceDate),
        dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
        items: invoice.items || [],
        shipmentDetails: invoice.shipmentDetails ? {
            ...invoice.shipmentDetails,
            shipDate: invoice.shipmentDetails.shipDate ? new Date(invoice.shipmentDetails.shipDate) : null,
            dateOfSupply: invoice.shipmentDetails.dateOfSupply ? new Date(invoice.shipmentDetails.dateOfSupply) : null,
        } : { 
            shipDate: null, trackingNumber: "", carrierName: "", consigneeName: "", consigneeAddress: "",
            consigneeGstin: "", consigneeStateCode: "", transportationMode: "", lrNo: "", vehicleNo: "",
            dateOfSupply: null, placeOfSupply: ""
        },
    };
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
    // Correctly serialize Date objects to ISO strings or pass null for IPC
    const serializedInvoice = {
      ...invoice,
      invoiceDate: invoice.invoiceDate.toISOString(), // invoiceDate is mandatory
      dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
      shipmentDetails: invoice.shipmentDetails ? {
        ...invoice.shipmentDetails,
        shipDate: invoice.shipmentDetails.shipDate ? invoice.shipmentDetails.shipDate.toISOString() : null,
        dateOfSupply: invoice.shipmentDetails.dateOfSupply ? invoice.shipmentDetails.dateOfSupply.toISOString() : null,
        // Ensure string fields are passed as strings, even if empty
        trackingNumber: invoice.shipmentDetails.trackingNumber || "",
        carrierName: invoice.shipmentDetails.carrierName || "",
        consigneeName: invoice.shipmentDetails.consigneeName || "",
        consigneeAddress: invoice.shipmentDetails.consigneeAddress || "",
        consigneeGstin: invoice.shipmentDetails.consigneeGstin || "",
        consigneeStateCode: invoice.shipmentDetails.consigneeStateCode || "",
        transportationMode: invoice.shipmentDetails.transportationMode || "",
        lrNo: invoice.shipmentDetails.lrNo || "",
        vehicleNo: invoice.shipmentDetails.vehicleNo || "",
        placeOfSupply: invoice.shipmentDetails.placeOfSupply || ""
      } : { // Provide a default structure if shipmentDetails itself is undefined/null
            shipDate: null, trackingNumber: "", carrierName: "", consigneeName: "", consigneeAddress: "",
            consigneeGstin: "", consigneeStateCode: "", transportationMode: "", lrNo: "", vehicleNo: "",
            dateOfSupply: null, placeOfSupply: ""
      },
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
export async function getCompanyInfo(): Promise<CompanyData | null> {
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
export async function saveCompanyInfo(company: CompanyData): Promise<boolean> {
  if (!isElectron()) {
    console.error('Electron API not available');
    return false;
  }
  
  try {
    // Ensure optional fields are passed as strings or null for consistency if backend expects it
    const companyToSave = {
        ...company,
        phone2: company.phone2 || null,
        gstin: company.gstin || null,
        bank_account_name: company.bank_account_name || null,
        bank_name: company.bank_name || null,
        bank_account: company.bank_account || null,
        bank_ifsc: company.bank_ifsc || null,
    };
    return await window.electronAPI.saveCompanyInfo(companyToSave);
  } catch (error) {
    console.error('Error saving company info with Electron:', error);
    return false;
  }
} 
