"use client"; 

import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserPlus, MoreHorizontal, Edit, Trash2, Mail, Phone, MapPin, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { CustomerForm, type CustomerFormValues } from "@/components/customer-form";
import type { Customer } from "@/types/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from "@/lib/firestore-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);
  const [isEditCustomerDialogOpen, setIsEditCustomerDialogOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();

  const { data: customers, isLoading: isDataLoading, error, refetch } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: getCustomers,
    initialData: []
  });

  const addMutation = useMutation({
    mutationFn: addCustomer,
    onSuccess: () => {
      toast({ title: "Customer Added", description: "The new customer has been added." });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsAddCustomerDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string, values: CustomerFormValues }) => updateCustomer(data.id, data.values),
    onSuccess: () => {
      toast({ title: "Customer Updated", description: "Customer details have been updated." });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsEditCustomerDialogOpen(false);
      setCurrentCustomer(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      toast({ title: "Customer Deleted", description: "The customer has been deleted." });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAddCustomer = async (data: CustomerFormValues) => {
    addMutation.mutate(data);
  };
  
  const handleEditCustomerClick = (customer: Customer) => {
    setCurrentCustomer(customer);
    setIsEditCustomerDialogOpen(true);
  };

  const handleSaveEditedCustomer = async (data: CustomerFormValues) => {
    if (currentCustomer) {
      updateMutation.mutate({ id: currentCustomer.id, values: data });
    }
  };
  
  const pageActions = (
     <Dialog open={isAddCustomerDialogOpen} onOpenChange={setIsAddCustomerDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" /> Add New Customer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new customer.
          </DialogDescription>
        </DialogHeader>
        <CustomerForm 
          onSubmit={handleAddCustomer} 
          isLoading={addMutation.isPending}
          onCancel={() => setIsAddCustomerDialogOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );

  if (error) {
     return (
      <div className="space-y-6">
        <PageHeader title="Manage Customers" description="View, add, and manage your customer information." actions={pageActions} />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error: Missing or Insufficient Permissions</AlertTitle>
          <AlertDescription>
            <p>The application cannot access the customer data. This is usually because the Firestore security rules have not been deployed to your project.</p>
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
        title="Manage Customers" 
        description="View, add, and manage your customer information."
        actions={pageActions}
      />

      <Dialog open={isEditCustomerDialogOpen} onOpenChange={(isOpen) => {
        setIsEditCustomerDialogOpen(isOpen);
        if (!isOpen) setCurrentCustomer(null);
      }}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update the customer details below.
            </DialogDescription>
          </DialogHeader>
          {currentCustomer && (
            <CustomerForm 
              onSubmit={handleSaveEditedCustomer}
              defaultValues={currentCustomer}
              isLoading={updateMutation.isPending}
              onCancel={() => {
                setIsEditCustomerDialogOpen(false);
                setCurrentCustomer(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
          <CardDescription>A list of all customers.</CardDescription>
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
                  <TableHead>Customer ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers?.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.id}</TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell><Link href={`mailto:${customer.email}`} className="hover:underline flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground"/> {customer.email}</Link></TableCell>
                    <TableCell><Link href={`tel:${customer.phone}`} className="hover:underline flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground"/> {customer.phone}</Link></TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-xs flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0"/>{customer.address}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditCustomerClick(customer)}>
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
                            title={`Delete Customer ${customer.name}`}
                            description="Are you sure you want to delete this customer? This action cannot be undone."
                            onConfirm={() => deleteMutation.mutate(customer.id)}
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
           {!isDataLoading && (!customers || customers.length === 0) && (
            <p className="py-4 text-center text-muted-foreground">No customers found. Add a new customer to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
