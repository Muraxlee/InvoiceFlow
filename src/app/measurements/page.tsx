
"use client"; 

import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, AlertCircle, RefreshCw, Barcode, Search, User, Package } from "lucide-react";
import { useState, useMemo } from "react";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MeasurementForm, type MeasurementFormValues } from "@/components/measurement-form";
import type { Measurement } from "@/types/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMeasurements, updateMeasurement, deleteMeasurement } from "@/lib/firestore-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function MeasurementsPage() {
  const queryClient = useQueryClient();
  const [isEditMeasurementDialogOpen, setIsEditMeasurementDialogOpen] = useState(false);
  const [currentMeasurement, setCurrentMeasurement] = useState<Measurement | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  
  const { data: measurements, isLoading: isDataLoading, error, refetch } = useQuery<Measurement[]>({
    queryKey: ['measurements'],
    queryFn: getMeasurements,
    initialData: [],
  });

  const filteredMeasurements = useMemo(() => {
    if (!measurements) return [];
    if (!searchTerm) return measurements;
    return measurements.filter(m => 
      m.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.uniqueId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [measurements, searchTerm]);

  const updateMutation = useMutation({
    mutationFn: (data: { id: string, values: Partial<Omit<Measurement, 'id' | 'createdAt'>> }) => updateMeasurement(data.id, data.values),
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
        <DialogContent className="sm:max-w-[625px]">
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
          <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by customer name or ID..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
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
                <TableHead>Customer / ID</TableHead>
                <TableHead>Garment Type</TableHead>
                <TableHead>Measurements</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMeasurements?.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{m.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                       <Barcode className="h-4 w-4 text-muted-foreground"/>
                       <span className="text-xs text-muted-foreground font-mono">{m.uniqueId}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground"/>
                        {m.type === 'Custom' ? m.customType : m.type}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                        {m.values.slice(0, 4).map(v => (
                            <Badge key={v.name} variant="secondary">{v.name}: {v.value}{v.unit}</Badge>
                        ))}
                        {m.values.length > 4 && <Badge variant="outline">+{m.values.length - 4} more</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{format(new Date(m.recordedDate), 'PP')}</TableCell>
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
           {!isDataLoading && (!filteredMeasurements || filteredMeasurements.length === 0) && (
            <p className="py-4 text-center text-muted-foreground">{searchTerm ? 'No results found.' : 'No measurements found. Add a new one to get started.'}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
