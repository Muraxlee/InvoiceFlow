
"use client"; 

import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FilePlus2, MoreHorizontal, Printer, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadFromLocalStorage, saveToLocalStorage } from "@/lib/localStorage";
import type { InvoiceFormValues } from "@/components/invoice-form";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";

const LOCAL_STORAGE_KEY = "app_invoices";

interface StoredInvoice extends InvoiceFormValues {
  id: string; 
  status: "Paid" | "Pending" | "Overdue" | "Draft"; 
  amount: number; 
}

const defaultInvoices: StoredInvoice[] = [
  { id: "INV001", customerName: "Alpha Inc.", customerEmail: "contact@alpha.com", invoiceDate: new Date("2024-07-15"), dueDate: new Date("2024-08-14"), amount: 12500.00, status: "Paid", items: [], invoiceNumber:"INV001" },
  { id: "INV002", customerName: "Beta LLC", customerEmail: "info@betallc.dev", invoiceDate: new Date("2024-07-18"), dueDate: new Date("2024-08-17"), amount: 8500.50, status: "Pending", items: [], invoiceNumber:"INV002" },
  { id: "INV003", customerName: "Gamma Co.", customerEmail: "support@gammaco.io", invoiceDate: new Date("2024-07-20"), dueDate: new Date("2024-08-19"), amount: 24000.75, status: "Overdue", items: [], invoiceNumber:"INV003" },
  { id: "INV004", customerName: "Delta Solutions", customerEmail: "solutions@delta.com", invoiceDate: new Date("2024-07-22"), dueDate: new Date("2024-08-21"), amount: 5000.00, status: "Draft", items: [], invoiceNumber:"INV004" },
];


const statusVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case "paid": return "default"; 
    case "pending": return "secondary"; 
    case "overdue": return "destructive";
    case "draft": return "outline";
    default: return "outline";
  }
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<StoredInvoice[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const storedInvoices = loadFromLocalStorage<StoredInvoice[]>(LOCAL_STORAGE_KEY, defaultInvoices).map(inv => ({
        ...inv,
        invoiceDate: new Date(inv.invoiceDate),
        dueDate: new Date(inv.dueDate)
    }));
    setInvoices(storedInvoices);
  }, []);

  const handleDeleteInvoice = (invoiceId: string) => {
    const updatedInvoices = invoices.filter(inv => inv.id !== invoiceId);
    setInvoices(updatedInvoices);
    saveToLocalStorage(LOCAL_STORAGE_KEY, updatedInvoices);
    toast({
      title: "Invoice Deleted",
      description: `Invoice ${invoiceId} has been successfully deleted.`,
    });
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
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.customerName}</TableCell>
                  <TableCell>{invoice.invoiceDate.toLocaleDateString()}</TableCell>
                  <TableCell>{invoice.dueDate.toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">₹{invoice.amount?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(invoice.status) as any}>{invoice.status}</Badge>
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
                        <DropdownMenuItem onClick={() => alert(`Edit invoice ${invoice.id}. This is a placeholder. Implement /invoices/${invoice.id}/edit page and functionality.`)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => alert(`Printing Original for ${invoice.id}... This is a placeholder for advanced print formatting.`)}>
                          <Printer className="mr-2 h-4 w-4" /> Print Original
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => alert(`Printing Duplicate for ${invoice.id}... This is a placeholder for advanced print formatting.`)}>
                          <Printer className="mr-2 h-4 w-4" /> Print Duplicate
                        </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => alert(`Printing Transport Bill for ${invoice.id}... This is a placeholder for advanced print formatting.`)}>
                          <Printer className="mr-2 h-4 w-4" /> Print Transport Bill
                        </DropdownMenuItem>
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
          {invoices.length === 0 && (
            <p className="py-4 text-center text-muted-foreground">No invoices found. Create a new invoice to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
