'use server';

import { revalidatePath } from 'next/cache';
import { InvoiceFormValues } from '@/components/invoice-form';
import { getAllInvoices as dbGetAllInvoices, 
         getInvoiceById as dbGetInvoiceById,
         saveInvoice as dbSaveInvoice, 
         deleteInvoice as dbDeleteInvoice,
         getCompanyInfo as dbGetCompanyInfo,
         saveCompanyInfo as dbSaveCompanyInfo,
         type StoredInvoice } from './database';

// Note: These server actions will use the direct database access since
// they run on the server. Electron integration happens at the client-side
// component level.

export async function getAllInvoices(): Promise<StoredInvoice[]> {
  try {
    return await dbGetAllInvoices();
  } catch (error) {
    console.error('Error in getAllInvoices action:', error);
    return [];
  }
}

export async function getInvoiceById(id: string): Promise<StoredInvoice | null> {
  try {
    return await dbGetInvoiceById(id);
  } catch (error) {
    console.error('Error in getInvoiceById action:', error);
    return null;
  }
}

export async function saveInvoice(invoice: StoredInvoice): Promise<boolean> {
  try {
    const result = await dbSaveInvoice(invoice);
    if (result) {
      revalidatePath('/invoices');
      revalidatePath(`/invoices/${invoice.id}`);
    }
    return result;
  } catch (error) {
    console.error('Error in saveInvoice action:', error);
    return false;
  }
}

export async function deleteInvoice(id: string): Promise<boolean> {
  try {
    const result = await dbDeleteInvoice(id);
    if (result) {
      revalidatePath('/invoices');
    }
    return result;
  } catch (error) {
    console.error('Error in deleteInvoice action:', error);
    return false;
  }
}

export async function getCompanyInfo() {
  try {
    return await dbGetCompanyInfo();
  } catch (error) {
    console.error('Error in getCompanyInfo action:', error);
    return null;
  }
}

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
  try {
    const result = await dbSaveCompanyInfo(company);
    if (result) {
      revalidatePath('/settings');
    }
    return result;
  } catch (error) {
    console.error('Error in saveCompanyInfo action:', error);
    return false;
  }
} 