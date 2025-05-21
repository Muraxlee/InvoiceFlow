"use client"; // Added to make this a Client Component

import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FilePlus2, MoreHorizontal, Printer, Edit, Trash2 } from "lucide-react";
import Link from "next/link";

// Placeholder data
const invoices = [
  { id: "INV001", customer: "Alpha Inc.", date: "2024-07-15", dueDate: "2024-08-14", amount: 1250.00, status: "Paid" },
  { id: "INV002", customer: "Beta LLC", date: "2024-07-18", dueDate: "2024-08-17", amount: 850.50, status: "Pending" },
  { id: "INV003", customer: "Gamma Co.", date: "2024-07-20", dueDate: "2024-08-19", amount: 2400.75, status: "Overdue" },
  { id: "INV004", customer: "Delta Solutions", date: "2024-07-22", dueDate: "2024-08-21", amount: 500.00, status: "Draft" },
];

const statusVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case "paid": return "default"; // Greenish if customized, or use primary
    case "pending": return "secondary"; // Bluish/Yellowish
    case "overdue": return "destructive";
    case "draft": return "outline";
    default: return "outline";
  }
}

export default function InvoicesPage() {
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
                  <TableCell className="font-medium">{invoice.id}</TableCell>
                  <TableCell>{invoice.customer}</TableCell>
                  <TableCell>{invoice.date}</TableCell>
                  <TableCell>{invoice.dueDate}</TableCell>
                  <TableCell className="text-right">${invoice.amount.toFixed(2)}</TableCell>
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
                        <DropdownMenuItem>
                          <Link href={`/invoices/${invoice.id}/edit`} className="flex items-center w-full"> {/* Placeholder edit link */}
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => alert(`Printing Original for ${invoice.id}... This is a placeholder.`)}>
                          <Printer className="mr-2 h-4 w-4" /> Print Original
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => alert(`Printing Duplicate for ${invoice.id}... This is a placeholder.`)}>
                          <Printer className="mr-2 h-4 w-4" /> Print Duplicate
                        </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => alert(`Printing Transport Bill for ${invoice.id}... This is a placeholder.`)}>
                          <Printer className="mr-2 h-4 w-4" /> Print Transport Bill
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => alert(`Deleting ${invoice.id}... This is a placeholder.`)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
