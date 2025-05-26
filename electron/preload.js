
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Invoice operations
  getAllInvoices: () => ipcRenderer.invoke('get-all-invoices'),
  getInvoiceById: (id) => ipcRenderer.invoke('get-invoice-by-id', id),
  saveInvoice: (invoice) => {
    // At this point, 'invoice' should have dates as ISO strings or null
    // as prepared by database-electron.ts. We can pass it directly.
    return ipcRenderer.invoke('save-invoice', invoice);
  },
  deleteInvoice: (id) => ipcRenderer.invoke('delete-invoice', id),
  
  // Company operations
  getCompanyInfo: () => ipcRenderer.invoke('get-company-info'),
  saveCompanyInfo: (data) => ipcRenderer.invoke('save-company-info', data), // Data should be prepared by database-electron.ts

  // Customer operations
  getAllCustomers: () => ipcRenderer.invoke('get-all-customers'),
  addCustomer: (customer) => ipcRenderer.invoke('add-customer', customer),
  updateCustomer: (customerId, customerData) => ipcRenderer.invoke('update-customer', { customerId, customerData }),
  deleteCustomer: (id) => ipcRenderer.invoke('delete-customer', id),
  clearAllCustomers: () => ipcRenderer.invoke('clear-all-customers'),

  // Product operations
  getAllProducts: () => ipcRenderer.invoke('get-all-products'),
  addProduct: (product) => ipcRenderer.invoke('add-product', product),
  updateProduct: (productId, productData) => ipcRenderer.invoke('update-product', { productId, productData }),
  deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
  clearAllProducts: () => ipcRenderer.invoke('clear-all-products'),

  // General data operations
  clearAllData: () => ipcRenderer.invoke('clear-all-data'),

  // User Management operations
  getAllUsers: () => ipcRenderer.invoke('get-all-users'),
  getUserByUsername: (username) => ipcRenderer.invoke('get-user-by-username', username),
  createUser: (userData) => ipcRenderer.invoke('create-user', userData),
  updateUser: (userId, userData) => ipcRenderer.invoke('update-user', { userId, userData }),
  deleteUser: (userId) => ipcRenderer.invoke('delete-user', userId),
  validateUserCredentials: (credentials) => ipcRenderer.invoke('validate-user-credentials', credentials),

  // Database Backup/Restore operations
  getDatabasePath: () => ipcRenderer.invoke('get-database-path'),
  backupDatabase: () => ipcRenderer.invoke('backup-database'),
  initiateDatabaseRestore: () => ipcRenderer.invoke('initiate-database-restore'),

});
