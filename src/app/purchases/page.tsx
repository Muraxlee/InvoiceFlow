
"use client";

import { useState, useMemo, Suspense, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isPast, startOfDay } from 'date-fns';
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import type { PurchaseInvoice } from "@/types/database";
import { getPurchaseInvoices, deletePurchaseInvoice, updatePurchaseInvoiceStatus } from "@/lib/firestore-actions";
import { FilePlus2, MoreHorizontal, Edit, Trash2, Loader2, AlertCircle, RefreshCw, Search, CheckCircle2 } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "paid" | "unpaid" | "overdue";

function PurchasesPageComponent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialStatusFilter = searchParams.get('status') as StatusFilter | null;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter || "all");
  
  useEffect(() => {
    setStatusFilter(initialStatusFilter || "all");
  }, [initialStatusFilter]);

  const { data: purchaseInvoices, isLoading, error, refetch } = useQuery<PurchaseInvoice[]>({
    queryKey: ['purchaseInvoices'],
    queryFn: getPurchaseInvoices,
  });

  const filteredInvoices = useMemo(() => {
    if (!purchaseInvoices) return [];
    
    const today = startOfDay(new Date());

    return purchaseInvoices.filter(invoice => {
      // Status Filtering
      const invoiceStatus = invoice.status || "Unpaid";
      const isOverdue = invoice.dueDate && isPast(new Date(invoice.dueDate)) && (invoiceStatus === 'Unpaid' || invoiceStatus === 'Pending');

      let statusMatch = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'overdue') {
          statusMatch = isOverdue;
        } else if (statusFilter === 'unpaid') {
          statusMatch = (invoiceStatus === 'Unpaid' || invoiceStatus === 'Pending') && !isOverdue;
        } else {
          statusMatch = invoiceStatus.toLowerCase() === statusFilter;
        }
      }

      // Search Term Filtering
      if (!statusMatch) return false;
      
      const lowercasedTerm = searchTerm.toLowerCase();
      if (!lowercasedTerm) return true;

      return (
        invoice.invoiceId.toLowerCase().includes(lowercasedTerm) ||
        invoice.vendor.toLowerCase().includes(lowercasedTerm) ||
        (isOverdue ? "overdue".includes(lowercasedTerm) : invoiceStatus.toLowerCase().includes(lowercasedTerm))
      );
    });
  }, [purchaseInvoices, searchTerm, statusFilter]);
  
  const updateStatusMutation = useMutation({
    mutationFn: ({ invoiceId, status }: { invoiceId: string; status: PurchaseInvoice['status'] }) => updatePurchaseInvoiceStatus(invoiceId, status),
    onSuccess: (_, { invoiceId }) => {
      toast({
        title: "Status Updated",
        description: `Invoice has been marked as Paid.`,
      });
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoice', invoiceId] });
    },
    onError: (error) => {
      toast({
        title: "Error Updating Status",
        description: "Failed to update the invoice status.",
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deletePurchaseInvoice,
    onSuccess: () => {
      toast({ title: "Purchase Invoice Deleted" });
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoices'] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const getStatusBadge = (invoice: PurchaseInvoice) => {
    let status = invoice.status;
    if (invoice.dueDate && isPast(new Date(invoice.dueDate)) && status === 'Unpaid') {
      status = 'Overdue';
    }
    const variant = status === 'Paid' ? 'success' : status === 'Overdue' ? 'destructive' : 'warning';
    return <Badge variant={variant as any}>{status}</Badge>;
  };

  const pageActions = (
    <div className="flex items-center gap-2">
      <Button onClick={() => refetch()} variant="outline" size="sm" className="hidden sm:flex">
        <RefreshCw className="mr-2 h-4 w-4" /> Refresh
      </Button>
      <Link href="/purchases/create">
        <Button><FilePlus2 className="mr-2 h-4 w-4" /> Add Purchase Invoice</Button>
      </Link>
    </div>
  );
  
  if (error) {
     return (
        <div className="space-y-6">
            <PageHeader title="Manage Purchases" description="Track your purchase invoices." actions={pageActions} />
            <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Data</AlertTitle>
            <AlertDescription>Could not load purchase invoices. Please check your connection and permissions.</AlertDescription>
            </Alert>
            <Button onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" /> Try Again</Button>
        </div>
     );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Manage Purchases" description="Track all your purchase invoices." actions={pageActions} />
      <Card>
        <CardHeader className="flex-col items-start gap-4">
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle>Purchase Invoice List</CardTitle>
              <CardDescription>A list of all your purchase invoices.</CardDescription>
            </div>
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by Invoice ID or Vendor..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
              <Button variant={statusFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('all')}>All</Button>
              <Button variant={statusFilter === 'paid' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('paid')}>Paid</Button>
              <Button variant={statusFilter === 'unpaid' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('unpaid')}>Unpaid</Button>
              <Button variant={statusFilter === 'overdue' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('overdue')}>Overdue</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices?.map(invoice => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceId}</TableCell>
                    <TableCell>{invoice.vendor}</TableCell>
                    <TableCell>{format(new Date(invoice.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>{invoice.dueDate ? format(new Date(invoice.dueDate), 'dd MMM yyyy') : 'N/A'}</TableCell>
                    <TableCell className="text-right">₹{invoice.amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell>{getStatusBadge(invoice)}</TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/purchases/${invoice.id}`}>
                            <DropdownMenuItem><Edit className="mr-2 h-4 w-4" /> View & Edit</DropdownMenuItem>
                          </Link>
                          {invoice.status !== 'Paid' && (
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ invoiceId: invoice.id, status: 'Paid' })}>
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Paid
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                           <ConfirmDialog
                            triggerButton={
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            }
                            title={`Delete Purchase Invoice ${invoice.invoiceId}`}
                            description="Are you sure? This action cannot be undone."
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
            <p className="py-8 text-center text-muted-foreground">No purchase invoices found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PurchasesPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PurchasesPageComponent />
    </Suspense>
  );
}
