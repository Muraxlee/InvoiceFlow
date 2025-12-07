
"use client"; 

import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { FilePlus2, MoreHorizontal, Printer, Edit, Trash2, Loader2, AlertCircle, RefreshCw, Search, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { type StoredInvoice } from "@/types/database";
import { getInvoices, deleteInvoice, updateInvoiceStatus } from "@/lib/firestore-actions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isPast, startOfDay } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState, useMemo, Suspense, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";

type StatusFilter = "all" | "paid" | "unpaid" | "overdue" | "pending";

function ProformasPageComponent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialStatusFilter = searchParams.get('status') as StatusFilter | null;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter || "all");

  useEffect(() => {
    setStatusFilter(initialStatusFilter || "all");
  }, [initialStatusFilter]);

  const { data: invoices, isLoading, error, refetch } = useQuery<StoredInvoice[]>({
    queryKey: ['invoices'],
    queryFn: getInvoices,
  });

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    
    return invoices.filter(invoice => {
      if (invoice.type !== 'Proforma Invoice') {
        return false;
      }
      
      const invoiceStatus = invoice.status || "Unpaid";
      const isOverdue = invoice.dueDate && isPast(new Date(invoice.dueDate)) && (invoiceStatus === 'Unpaid' || invoiceStatus === 'Partially Paid' || invoiceStatus === 'Pending');

      let statusMatch = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'overdue') {
          statusMatch = isOverdue;
        } else if (statusFilter === 'unpaid' || statusFilter === 'pending') {
          statusMatch = (invoiceStatus === 'Unpaid' || invoiceStatus === 'Pending' || invoiceStatus === 'Partially Paid') && !isOverdue;
        } else {
          statusMatch = invoiceStatus.toLowerCase() === statusFilter;
        }
      }

      if (!statusMatch) return false;
      
      const lowercasedTerm = searchTerm.toLowerCase();
      if (!lowercasedTerm) return true;

      return (
        invoice.invoiceNumber.toLowerCase().includes(lowercasedTerm) ||
        invoice.customerName.toLowerCase().includes(lowercasedTerm) ||
        (isOverdue ? "overdue".includes(lowercasedTerm) : invoiceStatus.toLowerCase().includes(lowercasedTerm))
      );
    });
  }, [invoices, searchTerm, statusFilter]);

  const deleteMutation = useMutation({
    mutationFn: deleteInvoice,
    onSuccess: (_, invoiceId) => {
      toast({
        title: "Proforma Invoice Deleted",
        description: `Proforma Invoice has been successfully deleted.`,
      });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      console.error("Failed to delete proforma invoice:", error);
      toast({
        title: "Error",
        description: "Failed to delete the proforma invoice",
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
        <PageHeader title="Manage Proforma Invoices" description="View, edit, and manage all your proforma invoices." actions={pageActions} />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error: Missing or Insufficient Permissions</AlertTitle>
          <AlertDescription>
            <p>Could not access proforma invoice data.</p>
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
        title="Manage Proforma Invoices" 
        description="View, edit, and manage all your proforma invoices."
        actions={pageActions}
      />

      <Card>
        <CardHeader>
          <CardTitle>Proforma Invoice List</CardTitle>
          <CardDescription>A list of all proforma invoices in the system.</CardDescription>
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
                  <TableHead>Proforma ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices?.map((invoice) => (
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
                            title={`Delete Proforma Invoice ${invoice.invoiceNumber}`}
                            description="Are you sure you want to delete this proforma invoice? This action cannot be undone."
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
          {!isLoading && (!filteredInvoices || filteredInvoices.length === 0) && (
            <p className="py-4 text-center text-muted-foreground">
              {searchTerm ? `No proforma invoices found for "${searchTerm}".` : "No proforma invoices found."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProformasPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProformasPageComponent />
    </Suspense>
  );
}
