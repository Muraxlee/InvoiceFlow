
"use client"; 

import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, AlertCircle, RefreshCw, Ruler } from "lucide-react";
import { useState } from "react";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { MeasurementForm, type MeasurementFormValues } from "@/components/measurement-form";
import type { Measurement } from "@/types/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMeasurements, addMeasurement, updateMeasurement, deleteMeasurement } from "@/lib/firestore-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";

export default function MeasurementsPage() {
  const queryClient = useQueryClient();
  const [isEditMeasurementDialogOpen, setIsEditMeasurementDialogOpen] = useState(false);
  const [currentMeasurement, setCurrentMeasurement] = useState<Measurement | null>(null);
  const { toast } = useToast();
  
  const { data: measurements, isLoading: isDataLoading, error, refetch } = useQuery<Measurement[]>({
    queryKey: ['measurements'],
    queryFn: getMeasurements,
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string, values: Partial<Omit<Measurement, 'id'>> }) => updateMeasurement(data.id, data.values),
    onSuccess: () => {
      toast({ title: "Measurement Updated", description: "Measurement record has been updated." });
      queryClient.invalidateQueries({ queryKey: ['measurements'] });
      setIsEditMeasurementDialogOpen(false);
      setCurrentMeasurement(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMeasurement,
    onSuccess: () => {
      toast({ title: "Measurement Deleted", description: "The measurement record has been deleted." });
      queryClient.invalidateQueries({ queryKey: ['measurements'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEditMeasurementClick = (measurement: Measurement) => {
    setCurrentMeasurement(measurement);
    setIsEditMeasurementDialogOpen(true);
  };

  const handleSaveEditedMeasurement = async (data: MeasurementFormValues) => {
    if (currentMeasurement) {
      const { id, ...measurementData } = data;
      updateMutation.mutate({ id: currentMeasurement.id, values: measurementData });
    }
  };

  const pageActions = (
    <div className="flex items-center gap-2">
      <Button onClick={() => refetch()} variant="outline" size="sm" className="hidden sm:flex">
        <RefreshCw className="mr-2 h-4 w-4" /> Refresh Data
      </Button>
      <Link href="/measurements/create" passHref>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Measurement
        </Button>
      </Link>
    </div>
  );

  if (error) {
     return (
      <div className="space-y-6">
        <PageHeader title="Manage Measurements" description="View, add, and manage your measurement records." actions={pageActions} />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error: Missing or Insufficient Permissions</AlertTitle>
          <AlertDescription>
            <p>The application cannot access measurement data. This is usually because the Firestore security rules have not been deployed to your project.</p>
            <p className="mt-2 font-semibold">Please deploy the rules using the Firebase CLI:</p>
            <code className="block my-2 p-2 bg-black/20 rounded text-xs">firebase deploy --only firestore:rules</code>
            <p>After deploying, please refresh this page.</p>
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetch()} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Manage Measurements" 
        description="View, add, and manage your measurement records."
        actions={pageActions}
      />

      <Dialog open={isEditMeasurementDialogOpen} onOpenChange={(isOpen) => {
        setIsEditMeasurementDialogOpen(isOpen);
        if (!isOpen) setCurrentMeasurement(null);
      }}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Measurement</DialogTitle>
            <DialogDescription>
              Update the measurement details below.
            </DialogDescription>
          </DialogHeader>
          {currentMeasurement && (
            <MeasurementForm 
              onSubmit={handleSaveEditedMeasurement}
              defaultValues={currentMeasurement}
              isLoading={updateMutation.isPending}
              onCancel={() => {
                setIsEditMeasurementDialogOpen(false);
                setCurrentMeasurement(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Saved Measurements</CardTitle>
          <CardDescription>A list of all measurement records.</CardDescription>
        </CardHeader>
        <CardContent>
        {isDataLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="animate-spin rounded-full h-8 w-8 text-primary" />
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Measurement Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Date Recorded</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {measurements?.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.type === 'Custom' ? m.customType : m.type}</TableCell>
                  <TableCell>{m.value} {m.unit}</TableCell>
                  <TableCell>{format(new Date(m.recordedDate), 'PP')}</TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-xs">{m.notes || '-'}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditMeasurementClick(m)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <ConfirmDialog
                          triggerButton={
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive focus:bg-destructive/10 w-full"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          }
                          title={`Delete Measurement`}
                          description="Are you sure you want to delete this measurement? This action cannot be undone."
                          onConfirm={() => deleteMutation.mutate(m.id)}
                          confirmText="Yes, Delete"
                          confirmVariant="destructive"
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
           {!isDataLoading && (!measurements || measurements.length === 0) && (
            <p className="py-4 text-center text-muted-foreground">No measurements found. Add a new one to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
