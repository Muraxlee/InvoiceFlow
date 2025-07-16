
"use client"; 

import PageHeader from "@/components/page-header";
import { MeasurementForm, type MeasurementFormValues } from "@/components/measurement-form";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation"; 
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addMeasurement } from "@/lib/firestore-actions";
import type { Measurement } from "@/types/database";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreateMeasurementPage() {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (newMeasurement: Omit<Measurement, 'id' | 'createdAt'>) => addMeasurement(newMeasurement),
    onSuccess: (measurementId) => {
      toast({
        title: "Measurement Saved",
        description: `The new measurement has been successfully saved.`,
      });
      queryClient.invalidateQueries({ queryKey: ['measurements'] });
      router.push(`/measurements`);
    },
    onError: (error) => {
      console.error('Error saving measurement:', error);
      toast({
        title: "Error",
        description: "Failed to save measurement. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (data: MeasurementFormValues) => {
    const { id, ...measurementData } = data;
    createMutation.mutate(measurementData);
  };

  const handleCancel = () => {
    router.push("/measurements");
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Add New Measurement" 
        description="Fill in the details below to record a new measurement." 
        actions={
            <Button variant="outline" onClick={handleCancel}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Measurements
            </Button>
        }
      />
      <MeasurementForm 
        onSubmit={handleSubmit} 
        isLoading={createMutation.isPending}
        onCancel={handleCancel}
      />
    </div>
  );
}
