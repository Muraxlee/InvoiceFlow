
"use client"; 

import PageHeader from "@/components/page-header";
import { MeasurementForm, type MeasurementFormValues } from "@/components/measurement-form";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation"; 
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addMeasurement } from "@/lib/firestore-actions";
import type { Measurement } from "@/types/database";
import { useState } from 'react';

function generateUniqueMeasurementId() {
  const prefix = "MEA";
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${timestamp}-${randomPart}`;
}

const defaultNewMeasurementValues: Partial<MeasurementFormValues> = {
  recordedDate: new Date(), 
  deliveryDate: null, 
  values: [{ name: "", value: 0, unit: "in" }],
  customerId: "",
  customerName: "",
  type: "Shirt", // Default type
  notes: ""
};

export default function CreateMeasurementPage() {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // Generate a stable unique ID only once for this new measurement page load
  const [uniqueId] = useState(generateUniqueMeasurementId());

  const createMutation = useMutation({
    mutationFn: (newMeasurement: Omit<Measurement, 'id' | 'createdAt'>) => addMeasurement(newMeasurement),
    onSuccess: () => {
      toast({
        title: "Measurement Created",
        description: `Measurement has been successfully created and saved.`,
      });
      queryClient.invalidateQueries({ queryKey: ['measurements'] });
      router.push(`/measurements`);
    },
    onError: (error) => {
      console.error('Error saving measurement:', error);
      toast({
        title: "Error",
        description: "Failed to create measurement. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (data: MeasurementFormValues) => {
    const { id, ...measurementData } = data;
    createMutation.mutate(measurementData as Omit<Measurement, 'id' | 'createdAt'>);
  };

  const handleCancel = () => {
    router.push("/measurements");
  };

  const initialValuesWithId = { ...defaultNewMeasurementValues, uniqueId };

  return (
    <div className="space-y-6">
      <PageHeader title="Create New Measurement" description="Fill in the details below to create a new measurement record." />
      <MeasurementForm 
        onSubmit={handleSubmit} 
        defaultValues={initialValuesWithId}
        isLoading={createMutation.isPending}
        onCancel={handleCancel}
      />
    </div>
  );
}
