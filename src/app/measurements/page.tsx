
"use client"; 

import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, AlertCircle, RefreshCw, Ruler, User } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { type Measurement } from "@/types/database";
import { getMeasurements, deleteMeasurement } from "@/lib/firestore-actions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { loadFromLocalStorage, MEASUREMENTS_STORAGE_KEY } from "@/lib/localStorage";

export default function MeasurementsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: measurements, isLoading, error, refetch } = useQuery<Measurement[]>({
    queryKey: ['measurements'],
    queryFn: getMeasurements,
    initialData: () => loadFromLocalStorage(MEASUREMENTS_STORAGE_KEY, []),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMeasurement,
    onSuccess: (_, measurementId) => {
      toast({
        title: "Measurement Deleted",
        description: `Measurement record has been successfully deleted.`,
      });
      queryClient.invalidateQueries({ queryKey: ['measurements'] });
    },
    onError: (error) => {
      console.error("Failed to delete measurement:", error);
      toast({
        title: "Error",
        description: "Failed to delete the measurement record.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (measurementId: string) => {
    deleteMutation.mutate(measurementId);
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
        <PageHeader title="Manage Measurements" description="View, edit, and manage all your measurement records." actions={pageActions} />
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
        description="View, edit, and manage all your measurement records."
        actions={pageActions}
      />

      <Card>
        <CardHeader>
          <CardTitle>Measurement Records</CardTitle>
          <CardDescription>A list of all measurement records in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && !measurements?.length ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="animate-spin rounded-full h-8 w-8 text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Record ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Garment Type</TableHead>
                  <TableHead>Date Recorded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {measurements?.map((measurement) => (
                  <TableRow key={measurement.id}>
                    <TableCell className="font-mono text-xs">{measurement.uniqueId}</TableCell>
                    <TableCell className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {measurement.customerName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{measurement.type === 'Custom' ? measurement.customType : measurement.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {measurement.recordedDate && format(new Date(measurement.recordedDate), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/measurements/${measurement.id}`} passHref>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" /> View & Edit
                            </DropdownMenuItem>
                          </Link>
                          <ConfirmDialog
                            triggerButton={
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive focus:bg-destructive/10 w-full"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            }
                            title={`Delete Record ${measurement.uniqueId}`}
                            description="Are you sure you want to delete this measurement record? This action cannot be undone."
                            onConfirm={() => handleDelete(measurement.id)}
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
          {!isLoading && (!measurements || measurements.length === 0) && (
            <p className="py-4 text-center text-muted-foreground">No measurements found. Add a new record to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
