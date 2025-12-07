
"use client"; 

import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { FilePlus2, MoreHorizontal, Printer, Edit, Trash2, Loader2, AlertCircle, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { type StoredInvoice } from "@/types/database";
import { getInvoices, deleteInvoice } from "@/lib/firestore-actions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState, useMemo, Suspense } from "react";
import { Input } from "@/components/ui/input";

function QuotationsPageComponent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: invoices, isLoading, error, refetch } = useQuery<StoredInvoice[]>({
    queryKey: ['invoices'],
    queryFn: getInvoices,
  });

  const filteredQuotations = useMemo(() => {
    if (!invoices) return [];
    
    return invoices.filter(invoice => {
      if (invoice.type !== 'Quotation') {
        return false;
      }
      
      const lowercasedTerm = searchTerm.toLowerCase();
      if (!lowercasedTerm) return true;

      return (
        invoice.invoiceNumber.toLowerCase().includes(lowercasedTerm) ||
        invoice.customerName.toLowerCase().includes(lowercasedTerm)
      );
    });
  }, [invoices, searchTerm]);

  const deleteMutation = useMutation({
    mutationFn: deleteInvoice,
    onSuccess: (_, invoiceId) => {
      toast({
        title: "Quotation Deleted",
        description: `Quotation has been successfully deleted.`,
      });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      console.error("Failed to delete quotation:", error);
      toast({
        title: "Error",
        description: "Failed to delete the quotation",
        variant: "destructive",
      });
    },
  });

  const pageActions = (
    <div className="flex items-center gap-2">
      <Button onClick={() => refetch()} variant="outline" size="sm" className="hidden sm:flex">
        <RefreshCw className="mr-2 h-4 w-4" /> Refresh Data
      </Button>
      <Link href="/invoices/create" passHref>
        <Button>
          <FilePlus2 className="mr-2 h-4 w-4" /> Create New Document
        </Button>
      </Link>
    </div>
  );

  if (error) {
     return (
      <div className="space-y-6">
        <PageHeader title="Manage Quotations" description="View, edit, and manage all your quotations." actions={pageActions} />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error: Missing or Insufficient Permissions</AlertTitle>
          <AlertDescription>
            <p>Could not access quotation data.</p>
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
        title="Manage Quotations" 
        description="View, edit, and manage all your quotations."
        actions={pageActions}
      />

      <Card>
        <CardHeader>
          <CardTitle>Quotation List</CardTitle>
          <CardDescription>A list of all quotations in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="animate-spin rounded-full h-8 w-8 text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quotation ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotations?.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.customerName}</TableCell>
                    <TableCell>
                      {invoice.invoiceDate && format(new Date(invoice.invoiceDate), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-right">₹{(invoice.amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/invoices/${invoice.id}`} passHref>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" /> View & Edit
                            </DropdownMenuItem>
                          </Link>
                          <Link href={`/invoices/${invoice.id}?tab=print`} passHref>
                            <DropdownMenuItem>
                              <Printer className="mr-2 h-4 w-4" /> Print
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuSeparator />
                          <ConfirmDialog
                            triggerButton={
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive focus:bg-destructive/10 w-full"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            }
                            title={`Delete Quotation ${invoice.invoiceNumber}`}
                            description="Are you sure you want to delete this quotation? This action cannot be undone."
                            onConfirm={() => deleteMutation.mutate(invoice.id)}
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
          {!isLoading && (!filteredQuotations || filteredQuotations.length === 0) && (
            <p className="py-4 text-center text-muted-foreground">
              {searchTerm ? `No quotations found for "${searchTerm}".` : "No quotations found."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function QuotationsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <QuotationsPageComponent />
    </Suspense>
  );
}
