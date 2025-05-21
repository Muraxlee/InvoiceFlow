
"use client"; 

import PageHeader from "@/components/page-header";
import { InvoiceForm, type InvoiceFormValues } from "@/components/invoice-form";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation"; 
import { useState } from "react";
import { loadFromLocalStorage, saveToLocalStorage } from "@/lib/localStorage";

const INVOICES_STORAGE_KEY = "app_invoices";

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
    
    const subtotal = data.items.reduce((acc, item) => acc + (item.quantity || 0) * (item.price || 0), 0);
    const gstAmount = subtotal * 0.18; 
    const totalAmount = subtotal + gstAmount;

    const newInvoice: StoredInvoice = {
      ...data,
      id: data.invoiceNumber, // Use the generated invoice number as the ID
      status: "Draft", 
      amount: totalAmount, 
    };

    // Check for ID collision (highly unlikely with daily counters, but good practice)
    if (currentInvoices.some(inv => inv.id === newInvoice.id)) {
        toast({
            title: "Error: Invoice ID Collision",
            description: `An invoice with ID ${newInvoice.id} already exists. This should not happen. Please try again or check settings.`,
            variant: "destructive",
        });
        setIsLoading(false);
        return;
    }


    const updatedInvoices = [...currentInvoices, newInvoice];
    saveToLocalStorage(INVOICES_STORAGE_KEY, updatedInvoices);
    
    console.log("Invoice Data Saved to localStorage:", newInvoice);
    
    await new Promise(resolve => setTimeout(resolve, 500)); 
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
