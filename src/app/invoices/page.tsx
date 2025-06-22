
"use client"; 

import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FilePlus2, MoreHorizontal, Printer, Edit, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { type StoredInvoice } from "@/types/database";
import { getInvoices, deleteInvoice } from "@/lib/firestore-actions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from 'date-fns';

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: invoices, isLoading } = useQuery<StoredInvoice[]>({
    queryKey: ['invoices'],
    queryFn: getInvoices,
    initialData: [],
  });

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

  const statusVariant = (status: string | undefined) => {
    if (!status) return "outline";
    switch (status.toLowerCase()) {
      case "paid": return "success"; 
      case "pending": return "warning"; 
      case "unpaid": return "warning";
      case "overdue": return "destructive";
      case "draft": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Manage Invoices" 
        description="View, edit, and manage all your invoices."
        actions={
          <Link href="/invoices/create" passHref>
            <Button>
              <FilePlus2 className="mr-2 h-4 w-4" /> Create New Invoice
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
          <CardDescription>A list of all invoices in the system.</CardDescription>
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
                {invoices?.map((invoice) => (
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
                      <Badge variant={statusVariant(invoice.status) as any}>{invoice.status || 'Unknown'}</Badge>
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
          {!isLoading && (!invoices || invoices.length === 0) && (
            <p className="py-4 text-center text-muted-foreground">No invoices found. Create a new invoice to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
