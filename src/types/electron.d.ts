interface ElectronAPI {
  getAllInvoices: () => Promise<any[]>;
  getInvoiceById: (id: string) => Promise<any | null>;
  saveInvoice: (invoice: any) => Promise<boolean>;
  deleteInvoice: (id: string) => Promise<boolean>;
  getCompanyInfo: () => Promise<any | null>;
  saveCompanyInfo: (data: any) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 