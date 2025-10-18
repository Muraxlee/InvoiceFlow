
"use client";

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getPurchaseInvoice, updatePurchaseInvoice } from '@/lib/firestore-actions';
import type { PurchaseInvoice } from '@/types/database';
import { PurchaseInvoiceForm, type PurchaseInvoiceFormValues } from '@/components/purchase-invoice-form';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function PurchaseInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: invoice, isLoading, error } = useQuery<PurchaseInvoice | null>({
    queryKey: ['purchaseInvoice', params.id],
    queryFn: () => getPurchaseInvoice(params.id),
    enabled: !!params.id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; values: PurchaseInvoiceFormValues }) => updatePurchaseInvoice(data.id, data.values),
    onSuccess: () => {
      toast({ title: "Purchase Invoice Updated" });
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoice', params.id] });
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoices'] });
      router.push('/purchases');
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to update invoice.", variant: "destructive" });
    }
  });

  useEffect(() => {
    if (!isLoading && !invoice && !error) {
      toast({ title: "Not Found", description: "Purchase invoice not found.", variant: "destructive" });
      router.push('/purchases');
    }
  }, [isLoading, invoice, error, router, toast, params.id]);
  
  const handleSubmit = (data: PurchaseInvoiceFormValues) => {
    if (!params.id) return;
    updateMutation.mutate({ id: params.id, values: data });
  };
  
  const handleCancel = () => {
      router.push('/purchases');
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!invoice) {
    return null; // Redirect is handled in useEffect
  }
  
  const defaultValues = {
    ...invoice,
    date: invoice.date ? new Date(invoice.date.seconds * 1000) : new Date(),
    dueDate: invoice.dueDate ? new Date(invoice.dueDate.seconds * 1000) : undefined,
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Edit Purchase Invoice ${invoice.invoiceId}`}
        description="Update the details of your purchase invoice."
        actions={<Button variant="outline" onClick={handleCancel}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>}
      />
      <Card>
        <CardContent className="pt-6">
            <PurchaseInvoiceForm 
                onSubmit={handleSubmit}
                defaultValues={defaultValues}
                isLoading={updateMutation.isPending}
                onCancel={handleCancel}
                isEditMode={true}
            />
        </CardContent>
      </Card>
    </div>
  );
}
