"use client"; 

import PageHeader from "@/components/page-header";
import { InvoiceForm, type InvoiceFormValues } from "@/components/invoice-form";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation"; 
import { useState } from "react";
import { StoredInvoice } from "@/lib/database";
import { saveInvoice } from "@/lib/database-wrapper";

export default function CreateInvoicePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: InvoiceFormValues) => {
    setIsLoading(true);
    
    try {
      // Calculate subtotal and tax amounts
      const subtotal = data.items.reduce((acc, item) => acc + (item.quantity || 0) * (item.price || 0), 0);
      
      // Calculate tax amounts based on GST type and rate
      let totalTaxAmount = 0;
      
      data.items.forEach(item => {
        const itemAmount = (item.quantity || 0) * (item.price || 0);
        const taxRate = (item.gstRate || 18) / 100;
        totalTaxAmount += itemAmount * taxRate;
      });
      
      const totalAmount = subtotal + totalTaxAmount;

      const newInvoice: StoredInvoice = {
        ...data,
        id: data.invoiceNumber, // Use the generated invoice number as the ID
        status: data.paymentStatus || "Unpaid", 
        amount: totalAmount, 
      };

      const success = await saveInvoice(newInvoice);
      
      if (success) {
        toast({
          title: "Invoice Created",
          description: `Invoice ${data.invoiceNumber} has been successfully created and saved.`,
        });
        router.push("/invoices");
      } else {
        throw new Error("Failed to save invoice to database");
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast({
        title: "Error",
        description: "Failed to create invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/invoices");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Create New Invoice" description="Fill in the details below to create a new invoice." />
      <InvoiceForm 
        onSubmit={handleSubmit} 
        isLoading={isLoading}
        onCancel={handleCancel}
      />
    </div>
  );
}
