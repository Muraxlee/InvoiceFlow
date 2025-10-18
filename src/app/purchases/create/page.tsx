
"use client";

import PageHeader from "@/components/page-header";
import { PurchaseInvoiceForm, type PurchaseInvoiceFormValues } from "@/components/purchase-invoice-form";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation"; 
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addPurchaseInvoice } from "@/lib/firestore-actions";
import type { PurchaseInvoice } from '@/types/database';

const defaultValues: Partial<PurchaseInvoiceFormValues> = {
  invoiceId: "",
  vendor: "",
  date: new Date(),
  dueDate: undefined,
  amount: 0,
  status: "Unpaid",
};

export default function CreatePurchaseInvoicePage() {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (newInvoice: Omit<PurchaseInvoice, 'id' | 'createdAt' | 'updatedAt'>) => addPurchaseInvoice(newInvoice),
    onSuccess: (id) => {
      toast({ title: "Purchase Invoice Added" });
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoices'] });
      router.push('/purchases');
    },
    onError: (error: any) => {
      let errorMessage = "Failed to add invoice. Please check your connection and try again.";
      if (error.message?.includes('permission-denied') || error.message?.includes('insufficient permissions')) {
        errorMessage = "Creation failed due to a permissions issue. Please ensure your Firestore security rules allow writing to the 'purchases' collection.";
      }
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    },
  });

  const handleSubmit = (data: PurchaseInvoiceFormValues) => {
    createMutation.mutate(data);
  };
  
  const handleCancel = () => {
    router.push("/purchases");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Add New Purchase Invoice" description="Log a new purchase to track your expenses." />
      <PurchaseInvoiceForm 
        onSubmit={handleSubmit}
        defaultValues={defaultValues}
        isLoading={createMutation.isPending}
        onCancel={handleCancel}
      />
    </div>
  );
}
