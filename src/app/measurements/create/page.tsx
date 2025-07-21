"use client"; 

import PageHeader from "@/components/page-header";
import { MeasurementForm, type MeasurementFormValues } from "@/components/measurement-form";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation"; 
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addMeasurement } from "@/lib/firestore-actions";
import type { Measurement } from '@/types/database';
import { useState, useEffect } from 'react';
import { Loader2 } from "lucide-react";

function generateUniqueMeasurementId() {
  const prefix = "MEA";
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${timestamp}-${randomPart}`;
}

const defaultNewMeasurement: Partial<MeasurementFormValues> = {
  recordedDate: new Date(),
  deliveryDate: null,
  values: [{ name: "Chest", value: 0, unit: "in" }],
  type: "Shirt",
  notes: "",
  customerName: "",
};

export default function CreateMeasurementPage() {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [initialValues, setInitialValues] = useState<Partial<MeasurementFormValues>>(defaultNewMeasurement);
  
  useEffect(() => {
    // Generate the unique ID only on the client to avoid hydration errors
    setInitialValues(prev => ({
        ...prev,
        uniqueId: generateUniqueMeasurementId(),
    }));
  }, []);

  const createMutation = useMutation({
    mutationFn: (newMeasurement: Omit<Measurement, 'id' | 'createdAt'>) => addMeasurement(newMeasurement),
    onSuccess: (measurementId) => {
      toast({
        title: "Measurement Record Created",
        description: `The new measurement record has been successfully saved.`,
      });
      queryClient.invalidateQueries({ queryKey: ['measurements'] });
      router.push(`/measurements`);
    },
    onError: (error: any) => {
      console.error('Error saving measurement:', error);
      let errorMessage = "Failed to create measurement record. Please try again.";
      if(error.message?.includes('permission-denied') || error.message?.includes('insufficient permissions')) {
        errorMessage = "Creation failed due to a permissions issue. Ensure all required fields, like Customer, are filled out correctly."
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: MeasurementFormValues) => {
    // Omitting the 'id' field, which is not needed for creation.
    const { id, ...measurementData } = data;
    
    // Ensure all optional fields have a default value to prevent Firestore errors with 'undefined'.
    const finalData = {
      ...measurementData,
      notes: measurementData.notes || '',
      customType: measurementData.customType || '',
      customerId: measurementData.customerId || '',
    };
    
    createMutation.mutate(finalData as Omit<Measurement, 'id' | 'createdAt'>);
  };

  const handleCancel = () => {
    router.push("/measurements");
  };

  if (!initialValues.uniqueId) {
    return (
        <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Create New Measurement Record" description="Fill in the details below to add a new measurement." />
      <MeasurementForm 
        onSubmit={handleSubmit} 
        defaultValues={initialValues}
        isLoading={createMutation.isPending}
        onCancel={handleCancel}
      />
    </div>
  );
}
