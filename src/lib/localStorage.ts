
'use client';

import { format as formatDateFns } from 'date-fns';
import { getDocs, collection, query, where, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { CompanyData } from '@/types/database';

// Helper function to safely get data from localStorage
export function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  try {
    const item = window.localStorage.getItem(key);
    if (item === null) {
        // If item doesn't exist, save the default value to localStorage
        saveToLocalStorage(key, defaultValue);
        return defaultValue;
    }
    return JSON.parse(item);
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    // If parsing fails, also save the default value
    saveToLocalStorage(key, defaultValue);
    return defaultValue;
  }
}

// Helper function to safely save data to localStorage
export function saveToLocalStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error writing to localStorage key "${key}":`, error);
  }
}

// Configuration for invoice numbering
export const INVOICE_CONFIG_KEY = "app_invoice_config";
export const DEFAULT_INVOICE_PREFIX = "INV";
export const DEFAULT_PROFORMA_PREFIX = "PRF";
export const DEFAULT_QUOTATION_PREFIX = "QTN";

export interface InvoiceConfig {
  prefix: string;
  proformaPrefix: string;
  quotationPrefix: string;
  includeDateInNumber: boolean;
  dailyCounters: {
    [dateKey: string]: number; // dateKey will be "PREFIX-DDMMYYYY"
  };
  globalCounters: {
    [prefix: string]: number;
  };
}

export async function generateInvoiceNumber(companyConfig: CompanyData): Promise<string> {
    if (!db) {
        throw new Error("Firestore is not available for generating invoice number.");
    }
    const { includeDateInNumber, invoicePrefix } = companyConfig;

    const date = new Date();
    const prefix = invoicePrefix || DEFAULT_INVOICE_PREFIX;

    if (includeDateInNumber) {
        const dateStr = formatDateFns(date, "ddMMyyyy");
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const q = query(collection(db, "invoices"),
            where("createdAt", ">=", Timestamp.fromDate(startOfDay)),
            where("createdAt", "<=", Timestamp.fromDate(endOfDay)),
            where("invoiceNumber", ">=", `${prefix}${dateStr}`),
            where("invoiceNumber", "<", `${prefix}${dateStr}9999`)
        );
        const querySnapshot = await getDocs(q);
        const nextNumber = querySnapshot.size + 1;
        return `${prefix}${dateStr}${String(nextNumber).padStart(4, '0')}`;
    } else {
        const q = query(collection(db, "invoices"), where("invoiceNumber", ">=", `${prefix}-`), where("invoiceNumber", "<", `${prefix}-~`));
        const querySnapshot = await getDocs(q);
        const nextNumber = querySnapshot.size + 1;
        return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
    }
}


// Key for storing Google AI API Key
export const GOOGLE_AI_API_KEY_STORAGE_KEY = "app_google_ai_api_key";

// Key for storing Company Name
export const COMPANY_NAME_STORAGE_KEY = "app_company_name";
export const DEFAULT_COMPANY_NAME = "Tailor";

// Key for storing Custom Theme values
export const CUSTOM_THEME_STORAGE_KEY = "app_custom_theme";
export interface CustomThemeValues {
  background?: string; // HSL string e.g., "220 15% 15%"
  foreground?: string;
  primary?: string;
  // Add more as needed for a more comprehensive custom theme
}
export const DEFAULT_CUSTOM_THEME_VALUES: CustomThemeValues = {
  background: "220 15% 15%",
  foreground: "220 10% 85%",
  primary: "180 60% 45%",
};

// Key for storing custom fonts
export const CUSTOM_FONTS_STORAGE_KEY = "app_custom_fonts";
export interface CustomFont {
  name: string;
  url: string;
}

// Measurement Settings
export const CUSTOM_GARMENT_TYPES_STORAGE_KEY = "app_custom_garment_types";
export const CUSTOM_MEASUREMENT_FIELDS_STORAGE_KEY = "app_custom_measurement_fields";

export const DEFAULT_GARMENT_TYPES = ["Shirt", "Pant", "Kurta", "Blouse", "Suit", "Coat", "Custom"];
export const DEFAULT_MEASUREMENT_FIELDS = [
  "Length", "Chest", "Waist", "Hip", "Shoulder", "Sleeve Length", "Neck", 
  "Inseam", "Thigh", "Knee", "Bottom", "Armhole", "Bicep", "Cuff", "Front Cross", "Back Cross"
];


// Key for storing last manual backup timestamp
export const LAST_BACKUP_TIMESTAMP_KEY = "app_last_backup_timestamp";

export interface AllApplicationData {
  [INVOICE_CONFIG_KEY]?: InvoiceConfig;
  [GOOGLE_AI_API_KEY_STORAGE_KEY]?: string;
  [COMPANY_NAME_STORAGE_KEY]?: string;
  appThemeKey?: string; 
  [CUSTOM_THEME_STORAGE_KEY]?: CustomThemeValues;
  [CUSTOM_FONTS_STORAGE_KEY]?: CustomFont[];
  [LAST_BACKUP_TIMESTAMP_KEY]?: number;
  appVersion?: string;
}
