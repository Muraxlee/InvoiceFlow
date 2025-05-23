
// Define the structure of StoredInvoice if it's complex and shared
// For now, using 'any' for simplicity, but ideally, this would be a proper type.
// Assuming InvoiceFormValues and other related types are defined elsewhere
// and StoredInvoice is imported or defined in files using it.

interface CustomerData {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface ProductData {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  price: number;
  gstCategory: string;
  igstRate: number;
  cgstRate: number;
  sgstRate: number;
}

interface ElectronAPI {
  // Invoice operations
  getAllInvoices: () => Promise<any[]>; // Consider defining a stricter type for invoice
  getInvoiceById: (id: string) => Promise<any | null>;
  saveInvoice: (invoice: any) => Promise<boolean>; // Invoice data might need specific typing
  deleteInvoice: (id: string) => Promise<boolean>;
  
  // Company operations
  getCompanyInfo: () => Promise<any | null>; // Define CompanyInfo type
  saveCompanyInfo: (data: any) => Promise<boolean>; // Define CompanyInfo type for data

  // Customer operations
  getAllCustomers: () => Promise<CustomerData[]>;
  addCustomer: (customer: CustomerData) => Promise<boolean>;
  deleteCustomer: (id: string) => Promise<boolean>;
  clearAllCustomers: () => Promise<boolean>;

  // Product operations
  getAllProducts: () => Promise<ProductData[]>;
  addProduct: (product: ProductData) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  clearAllProducts: () => Promise<boolean>;

  // General data operations
  clearAllData: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// To make this file a module and avoid "Cannot be compiled under '--isolatedModules'"
export {};
