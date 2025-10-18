
"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isPast, startOfDay } from 'date-fns';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import type { PurchaseInvoice } from "@/types/database";
import { getPurchaseInvoices, deletePurchaseInvoice } from "@/lib/firestore-actions";
import { FilePlus2, MoreHorizontal, Edit, Trash2, Loader2, AlertCircle, RefreshCw, Search } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function PurchasesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: purchaseInvoices, isLoading, error, refetch } = useQuery<PurchaseInvoice[]>({
    queryKey: ['purchaseInvoices'],
    queryFn: getPurchaseInvoices,
  });

  const filteredInvoices = useMemo(() => {
    if (!purchaseInvoices) return [];
    return purchaseInvoices.filter(invoice => {
      const lowercasedTerm = searchTerm.toLowerCase();
      return invoice.invoiceId.toLowerCase().includes(lowercasedTerm) ||
             invoice.vendor.toLowerCase().includes(lowercasedTerm);
    });
  }, [purchaseInvoices, searchTerm]);

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
        <CardHeader className="flex flex-row items-center justify-between gap-4">
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
