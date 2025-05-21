"use client"; // This page uses InvoiceForm which is a client component

import PageHeader from "@/components/page-header";
import { InvoiceForm } from "@/components/invoice-form";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation"; // Corrected import
import { useState } from "react";

export default function CreateInvoicePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setIsLoading(true);
    console.log("Invoice Data:", data);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    toast({
      title: "Invoice Created",
      description: `Invoice ${data.invoiceNumber} has been successfully created.`,
    });
    router.push("/invoices"); // Redirect to invoice list after creation
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Create New Invoice" description="Fill in the details below to create a new invoice." />
      <InvoiceForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
