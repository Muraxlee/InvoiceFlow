
"use client"; 

import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserPlus, MoreHorizontal, Edit, Trash2, Mail, Phone, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadFromLocalStorage, saveToLocalStorage } from "@/lib/localStorage";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";

const LOCAL_STORAGE_KEY = "app_customers";

const defaultCustomers = [
  { id: "CUST001", name: "Alpha Inc.", email: "contact@alpha.com", phone: "555-0101", address: "123 Tech Road, Silicon Valley, CA" },
  { id: "CUST002", name: "Beta LLC", email: "info@betallc.dev", phone: "555-0102", address: "456 Code Lane, Austin, TX" },
  { id: "CUST003", name: "Gamma Co.", email: "support@gammaco.io", phone: "555-0103", address: "789 Byte Street, New York, NY" },
];

export type Customer = typeof defaultCustomers[0];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const storedCustomers = loadFromLocalStorage<Customer[]>(LOCAL_STORAGE_KEY, defaultCustomers);
    setCustomers(storedCustomers);
  }, []);

  const handleDeleteCustomer = (customerId: string) => {
    const updatedCustomers = customers.filter(c => c.id !== customerId);
    setCustomers(updatedCustomers);
    saveToLocalStorage(LOCAL_STORAGE_KEY, updatedCustomers);
    toast({
      title: "Customer Deleted",
      description: `Customer ${customerId} has been successfully deleted.`,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Manage Customers" 
        description="View, add, and manage your customer information."
        actions={
          <Button onClick={() => alert("Add New Customer: This is a placeholder. Implement form and update localStorage.")}>
            <UserPlus className="mr-2 h-4 w-4" /> Add New Customer
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
          <CardDescription>A list of all customers.</CardDescription>
        </CardHeader>
        <CardContent>
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
                        <DropdownMenuItem onClick={() => alert(`Edit customer ${customer.id}. This is a placeholder. Implement edit form and functionality.`)}>
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
           {customers.length === 0 && (
            <p className="py-4 text-center text-muted-foreground">No customers found. Add a new customer to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
