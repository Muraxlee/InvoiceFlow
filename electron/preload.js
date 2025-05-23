const { contextBridge, ipcRenderer } = require('electron');

// Expose IPC functionality to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Invoice operations
  getAllInvoices: () => ipcRenderer.invoke('get-all-invoices'),
  getInvoiceById: (id) => ipcRenderer.invoke('get-invoice-by-id', id),
  saveInvoice: (invoice) => ipcRenderer.invoke('save-invoice', invoice),
  deleteInvoice: (id) => ipcRenderer.invoke('delete-invoice', id),
  
  // Company operations
  getCompanyInfo: () => ipcRenderer.invoke('get-company-info'),
  saveCompanyInfo: (data) => ipcRenderer.invoke('save-company-info', data)
}); 