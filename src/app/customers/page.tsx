"use client"; 

import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserPlus, MoreHorizontal, Edit, Trash2, Mail, Phone, MapPin, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { CustomerForm, type CustomerFormValues } from "@/components/customer-form";

export interface Customer extends CustomerFormValues {
  // id is already in CustomerFormValues
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);
  const [isEditCustomerDialogOpen, setIsEditCustomerDialogOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { toast } = useToast();

  const fetchCustomers = useCallback(async () => {
    setIsDataLoading(true);
    if (window.electronAPI) {
      try {
        const fetchedCustomers = await window.electronAPI.getAllCustomers();
        setCustomers(fetchedCustomers);
      } catch (error) {
        console.error("Error fetching customers:", error);
        toast({ title: "Error", description: "Could not load customers.", variant: "destructive" });
      }
    } else {
      toast({ title: "Error", description: "Desktop features not available in web mode.", variant: "destructive" });
    }
    setIsDataLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleDeleteCustomer = async (customerId: string) => {
    if (window.electronAPI) {
      try {
        const success = await window.electronAPI.deleteCustomer(customerId);
        if (success) {
          setCustomers(prev => prev.filter(c => c.id !== customerId));
          toast({
            title: "Customer Deleted",
            description: `Customer ${customerId} has been successfully deleted.`,
          });
        } else {
          throw new Error("Failed to delete customer via Electron API");
        }
      } catch (error) {
        console.error("Error deleting customer:", error);
        toast({ title: "Error", description: "Could not delete customer.", variant: "destructive" });
      }
    }
  };

  const handleAddCustomer = async (data: CustomerFormValues) => {
    setIsLoading(true);
    if (window.electronAPI) {
      try {
        const success = await window.electronAPI.addCustomer(data);
        if (success) {
          await fetchCustomers(); // Re-fetch to get the latest list including the new one
          setIsLoading(false);
          setIsAddCustomerDialogOpen(false);
          toast({
            title: "Customer Added",
            description: `Customer ${data.name} has been successfully added.`,
          });
        } else {
          throw new Error("Failed to add customer via Electron API");
        }
      } catch (error) {
        console.error("Error adding customer:", error);
        const errorMessage = error instanceof Error ? error.message : "Could not add customer.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };
  
  const handleEditCustomerClick = (customer: Customer) => {
    setCurrentCustomer(customer);
    setIsEditCustomerDialogOpen(true);
  };

  const handleSaveEditedCustomer = async (data: CustomerFormValues) => {
    setIsLoading(true);
    if (window.electronAPI && currentCustomer) {
      try {
        // Ensure the ID is not changed from the original customer
        const updateData = { 
          ...data,
          id: currentCustomer.id // Preserve the original ID
        };
        
        const success = await window.electronAPI.updateCustomer(currentCustomer.id, updateData);
        if (success) {
          await fetchCustomers(); // Re-fetch to get the updated list
          setIsLoading(false);
          setIsEditCustomerDialogOpen(false);
          setCurrentCustomer(null);
          toast({
            title: "Customer Updated",
            description: `Customer ${data.name} has been successfully updated.`,
          });
        } else {
          throw new Error("Failed to update customer via Electron API");
        }
      } catch (error) {
        console.error("Error updating customer:", error);
        const errorMessage = error instanceof Error ? error.message : "Could not update customer.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };


  return (
    <div className="space-y-6">
      <PageHeader 
        title="Manage Customers" 
        description="View, add, and manage your customer information."
        actions={
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
                isLoading={isLoading}
                onCancel={() => setIsAddCustomerDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        }
      />

      {/* Edit Customer Dialog */}
      <Dialog open={isEditCustomerDialogOpen} onOpenChange={(isOpen) => {
        setIsEditCustomerDialogOpen(isOpen);
        if (!isOpen) setCurrentCustomer(null); // Reset current customer when dialog closes
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
              isLoading={isLoading}
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
                {customers.map((customer) => (
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
                            onConfirm={() => handleDeleteCustomer(customer.id)}
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
           {!isDataLoading && customers.length === 0 && (
            <p className="py-4 text-center text-muted-foreground">No customers found. Add a new customer to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    