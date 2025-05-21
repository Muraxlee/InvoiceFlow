
"use client"; 

import PageHeader from "@/components/page-header";
import { InvoiceForm, type InvoiceFormValues } from "@/components/invoice-form"; // Ensure InvoiceFormValues is exported
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation"; 
import { useState } from "react";
import { loadFromLocalStorage, saveToLocalStorage } from "@/lib/localStorage";

const INVOICES_STORAGE_KEY = "app_invoices";

// Define a more complete StoredInvoice type if it doesn't exist elsewhere
// This should match the one in invoices/page.tsx if you consolidate types
interface StoredInvoice extends InvoiceFormValues {
  id: string;
  status: "Paid" | "Pending" | "Overdue" | "Draft";
  amount: number;
}


export default function CreateInvoicePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: InvoiceFormValues) => {
    setIsLoading(true);
    
    const currentInvoices = loadFromLocalStorage<StoredInvoice[]>(INVOICES_STORAGE_KEY, []);
    
    // Calculate amount from items
    const subtotal = data.items.reduce((acc, item) => acc + (item.quantity || 0) * (item.price || 0), 0);
    const gstAmount = subtotal * 0.18; // Assuming a flat 18% GST for now
    const totalAmount = subtotal + gstAmount;

    const newInvoice: StoredInvoice = {
      ...data,
      id: data.invoiceNumber || `INV-${Date.now()}`, // Ensure an ID
      status: "Draft", // Default status for new invoices
      amount: totalAmount, 
    };

    const updatedInvoices = [...currentInvoices, newInvoice];
    saveToLocalStorage(INVOICES_STORAGE_KEY, updatedInvoices);
    
    console.log("Invoice Data Saved to localStorage:", newInvoice);
    
    await new Promise(resolve => setTimeout(resolve, 500)); // Shorter delay for local save
    setIsLoading(false);
    toast({
      title: "Invoice Created",
      description: `Invoice ${data.invoiceNumber} has been successfully created and saved locally.`,
    });
    router.push("/invoices"); 
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Create New Invoice" description="Fill in the details below to create a new invoice." />
      <InvoiceForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
