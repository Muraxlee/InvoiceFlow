
import type { User as AppUser } from '@/lib/database'; 

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

type UserCreationData = Omit<AppUser, 'id' | 'isSystemAdmin'> & { password_NOT_Hashed_Yet: string }; 
type UserUpdateData = Partial<Omit<AppUser, 'id' | 'isSystemAdmin' | 'password'>> & { password_NOT_Hashed_Yet?: string };
type UserListData = Omit<AppUser, 'password'>;


interface ElectronAPI {
  // Invoice operations
  getAllInvoices: () => Promise<any[]>; 
  getInvoiceById: (id: string) => Promise<any | null>;
  saveInvoice: (invoice: any) => Promise<boolean>; 
  deleteInvoice: (id: string) => Promise<boolean>;
  
  // Company operations
  getCompanyInfo: () => Promise<any | null>; 
  saveCompanyInfo: (data: any) => Promise<boolean>; 

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

  // User Management operations
  getAllUsers: () => Promise<UserListData[]>;
  createUser: (userData: Omit<AppUser, 'id' | 'isSystemAdmin' | 'password'> & { password: string } ) => Promise<string | null>; 
  updateUser: (userId: string, userData: Partial<Omit<AppUser, 'id' | 'isSystemAdmin' | 'password'>> & { password?: string }) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  validateUserCredentials: (credentials: {username: string, password_NOT_Hashed_Yet: string}) => Promise<UserListData | null>;

  // Database Backup/Restore operations
  getDatabasePath: () => Promise<string>;
  backupDatabase: () => Promise<{success: boolean; path?: string; message?: string}>;
  initiateDatabaseRestore: () => Promise<{success: boolean; message?: string}>; // Changed from restoreDatabase
  
  // Optional generic dialogs (if needed directly by renderer)
  // showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>;
  // showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
