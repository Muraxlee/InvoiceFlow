
"use client"; 

import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FilePlus2, MoreHorizontal, Printer, Edit, Trash2, Loader2, AlertCircle, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { type StoredInvoice } from "@/types/database";
import { getInvoices, deleteInvoice } from "@/lib/firestore-actions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isPast, startOfDay } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState, useMemo, Suspense, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

type StatusFilter = "all" | "paid" | "unpaid" | "overdue" | "pending";

function InvoicesPageComponent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialStatusFilter = searchParams.get('status') as StatusFilter | null;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter || "all");

  useEffect(() => {
    // This allows updating the filter if the user navigates here again with a new query param
    setStatusFilter(initialStatusFilter || "all");
  }, [initialStatusFilter]);

  const { data: invoices, isLoading, error, refetch } = useQuery<StoredInvoice[]>({
    queryKey: ['invoices'],
    queryFn: getInvoices,
  });

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    
    const today = startOfDay(new Date());

    return invoices.filter(invoice => {
      // Status Filtering
      const invoiceStatus = invoice.status || "Unpaid";
      const isOverdue = invoice.dueDate && isPast(new Date(invoice.dueDate)) && (invoiceStatus === 'Unpaid' || invoiceStatus === 'Partially Paid' || invoiceStatus === 'Pending');

      let statusMatch = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'overdue') {
          statusMatch = isOverdue;
        } else if (statusFilter === 'unpaid') {
          statusMatch = (invoiceStatus === 'Unpaid' || invoiceStatus === 'Pending' || invoiceStatus === 'Partially Paid') && !isOverdue;
        } else if (statusFilter === 'pending') {
          statusMatch = !['Paid', 'Draft'].includes(invoiceStatus);
        } else {
          statusMatch = invoiceStatus.toLowerCase() === statusFilter;
        }
      }

      // Search Term Filtering
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
        title: "Invoice Deleted",
        description: `Invoice has been successfully deleted.`,
      });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      console.error("Failed to delete invoice:", error);
      toast({
        title: "Error",
        description: "Failed to delete the invoice",
        variant: "destructive",
      });
    },
  });

  const handleDeleteInvoice = (invoiceId: string) => {
    deleteMutation.mutate(invoiceId);
  };

  const getStatusBadge = (invoice: StoredInvoice) => {
    let status = invoice.status || 'Unpaid';
    if (invoice.dueDate && isPast(new Date(invoice.dueDate)) && (status === 'Unpaid' || status === 'Pending' || status === 'Partially Paid')) {
        status = 'Overdue';
    }

    const variant = status.toLowerCase() === 'paid' ? 'success' :
                    status.toLowerCase() === 'overdue' ? 'destructive' :
                    status.toLowerCase() === 'pending' || status.toLowerCase() === 'unpaid' ? 'warning' :
                    status.toLowerCase() === 'partially paid' ? 'info' :
                    'outline';
    return <Badge variant={variant as any}>{status}</Badge>;
  };
  
  const pageActions = (
    <div className="flex items-center gap-2">
      <Button onClick={() => refetch()} variant="outline" size="sm" className="hidden sm:flex">
        <RefreshCw className="mr-2 h-4 w-4" /> Refresh Data
      </Button>
      <Link href="/invoices/create" passHref>
        <Button>
          <FilePlus2 className="mr-2 h-4 w-4" /> Create New Invoice
        </Button>
      </Link>
    </div>
  );

  if (error) {
     return (
      <div className="space-y-6">
        <PageHeader title="Manage Invoices" description="View, edit, and manage all your invoices." actions={pageActions} />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error: Missing or Insufficient Permissions</AlertTitle>
          <AlertDescription>
            <p>The application cannot access invoice data. This is usually because the Firestore security rules have not been deployed to your project.</p>
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
        title="Manage Invoices" 
        description="View, edit, and manage all your invoices."
        actions={pageActions}
      />

      <Card>
        <CardHeader className="flex-col items-start gap-4">
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle>Invoice List</CardTitle>
              <CardDescription>A list of all invoices in the system.</CardDescription>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by ID, customer, status..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
              <Button variant={statusFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('all')}>All</Button>
              <Button variant={statusFilter === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('pending')}>Pending</Button>
              <Button variant={statusFilter === 'paid' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('paid')}>Paid</Button>
              <Button variant={statusFilter === 'unpaid' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('unpaid')}>Unpaid</Button>
              <Button variant={statusFilter === 'overdue' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('overdue')}>Overdue</Button>
          </div>
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
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
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
                    <TableCell>
                      {invoice.dueDate ? format(new Date(invoice.dueDate), 'dd MMM yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">₹{(invoice.amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                    <TableCell>
                      {getStatusBadge(invoice)}
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
                          <Link href={`/invoices/${invoice.id}`} passHref>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" /> View & Edit
                            </DropdownMenuItem>
                          </Link>
                          <Link href={`/invoices/${invoice.id}?tab=print`} passHref>
                            <DropdownMenuItem>
                              <Printer className="mr-2 h-4 w-4" /> Print Invoice
                            </DropdownMenuItem>
                          </Link>
                          <ConfirmDialog
                            triggerButton={
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive focus:bg-destructive/10 w-full"
                                onSelect={(e) => e.preventDefault()} // Prevent menu closing on select
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            }
                            title={`Delete Invoice ${invoice.invoiceNumber}`}
                            description="Are you sure you want to delete this invoice? This action cannot be undone."
                            onConfirm={() => handleDeleteInvoice(invoice.id)}
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
              {searchTerm ? `No invoices found for "${searchTerm}".` : "No invoices found. Create a new invoice to get started."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Wrap the component in Suspense because useSearchParams requires it.
export default function InvoicesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InvoicesPageComponent />
    </Suspense>
  );
}
