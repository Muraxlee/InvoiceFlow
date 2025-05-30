export interface StoredInvoice {
  id: string;
  customerId: string;
  userId: string;
  companyId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  status: string;
  amount: number;
  notes: string;
  termsAndConditions: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  items: Array<{
    id?: string;
    productId?: string;
    quantity: number;
    price: number;
    description: string;
    applyIgst?: boolean;
    applyCgst?: boolean;
    applySgst?: boolean;
    igstRate?: number;
    cgstRate?: number;
    sgstRate?: number;
  }>;
  shipmentDetails?: {
    shipDate?: string;
    trackingNumber?: string;
    carrierName?: string;
    consigneeName?: string;
    consigneeAddress?: string;
    consigneeGstin?: string;
    consigneeStateCode?: string;
    transportationMode?: string;
    lrNo?: string;
    vehicleNo?: string;
    dateOfSupply?: string;
    placeOfSupply?: string;
  };
} 