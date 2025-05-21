
'use client';

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

export interface InvoiceConfig {
  prefix: string;
  dailyCounters: {
    [dateKey: string]: number; // dateKey will be "DDMMYYYY"
  };
}

// Key for storing Google AI API Key
export const GOOGLE_AI_API_KEY_STORAGE_KEY = "app_google_ai_api_key";
