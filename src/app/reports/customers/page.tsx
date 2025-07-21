
"use client";

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCustomers, getInvoices } from '@/lib/firestore-actions';
import type { Customer, StoredInvoice } from '@/types/database';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/page-header';
import { Loader2, Search, X, RefreshCw, ArrowLeft, FileDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { isPast } from 'date-fns';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type CustomerReportData = Customer & {
    totalValue: number;
    invoiceCounts: {
        paid: number;
        unpaid: number;
        pending: number;
        overdue: number;
    };
};

export default function CustomerReportPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');

    const { data: customers, isLoading: isLoadingCustomers, refetch: refetchCustomers } = useQuery<Customer[]>({
        queryKey: ['customers'],
        queryFn: getCustomers,
    });

    const { data: invoices, isLoading: isLoadingInvoices, refetch: refetchInvoices } = useQuery<StoredInvoice[]>({
        queryKey: ['invoices'],
        queryFn: getInvoices,
    });

    const reportData = useMemo<CustomerReportData[]>(() => {
        if (!customers || !invoices) return [];
        return customers.map(customer => {
            const customerInvoices = invoices.filter(inv => inv.customerId === customer.id);
            const report: CustomerReportData = {
                ...customer,
                totalValue: 0,
                invoiceCounts: { paid: 0, unpaid: 0, pending: 0, overdue: 0 }
            };

            customerInvoices.forEach(inv => {
                let status = inv.status || 'Unpaid';
                if (inv.dueDate && isPast(new Date(inv.dueDate)) && ['Unpaid', 'Pending', 'Partially Paid'].includes(status)) {
                    status = 'Overdue';
                }

                if (status === 'Paid') {
                    report.invoiceCounts.paid++;
                    report.totalValue += inv.amount;
                } else if (status === 'Unpaid' || status === 'Partially Paid') {
                    report.invoiceCounts.unpaid++;
                } else if (status === 'Pending') {
                    report.invoiceCounts.pending++;
                } else if (status === 'Overdue') {
                    report.invoiceCounts.overdue++;
                }
            });
            return report;
        });
    }, [customers, invoices]);

    const filteredData = useMemo(() => {
        return reportData.filter(customer => {
            const lowercasedTerm = searchTerm.toLowerCase();
            if (lowercasedTerm && !customer.name.toLowerCase().includes(lowercasedTerm) && !customer.email.toLowerCase().includes(lowercasedTerm)) {
                return false;
            }
            
            const min = parseFloat(minAmount);
            const max = parseFloat(maxAmount);
            if (!isNaN(min) && customer.totalValue < min) return false;
            if (!isNaN(max) && customer.totalValue > max) return false;

            return true;
        }).sort((a, b) => b.totalValue - a.totalValue);
    }, [reportData, searchTerm, minAmount, maxAmount]);

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.text("Customer Report", 14, 16);
        autoTable(doc, {
            head: [['Customer', 'Email', 'Paid', 'Pending', 'Overdue', 'Total Value (₹)']],
            body: filteredData.map(c => [
                c.name,
                c.email,
                c.invoiceCounts.paid,
                c.invoiceCounts.unpaid + c.invoiceCounts.pending,
                c.invoiceCounts.overdue,
                c.totalValue.toLocaleString('en-IN')
            ]),
            startY: 20
        });
        doc.save('customer_report.pdf');
    };

    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredData.map(c => ({
            'Customer': c.name,
            'Email': c.email,
            'Paid Invoices': c.invoiceCounts.paid,
            'Pending Invoices': c.invoiceCounts.unpaid + c.invoiceCounts.pending,
            'Overdue Invoices': c.invoiceCounts.overdue,
            'Total Value (INR)': c.totalValue
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
        XLSX.writeFile(workbook, "customer_report.xlsx");
    };

    const clearFilters = () => {
        setSearchTerm('');
        setMinAmount('');
        setMaxAmount('');
    };

    const handleRefresh = () => {
        refetchCustomers();
        refetchInvoices();
    }

    return (
        <div className="space-y-6">
            <PageHeader
              title="Customer Report"
              description="Analyze customer value and invoice history."
              actions={
                <div className="flex items-center gap-2">
                  <Link href="/reports">
                    <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                  </Link>
                  <Button onClick={handleRefresh} variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
                </div>
              }
            />
            <Card>
                <CardHeader>
                    <CardTitle>Filters & Search</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                           <label className="text-sm font-medium">Search Customer</label>
                           <div className="relative">
                               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                               <Input placeholder="Name or Email" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-sm font-medium">Min Total Value (₹)</label>
                           <Input type="number" placeholder="e.g., 5000" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                           <label className="text-sm font-medium">Max Total Value (₹)</label>
                           <Input type="number" placeholder="e.g., 50000" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
                        </div>
                    </div>
                    <Button onClick={clearFilters} variant="ghost" size="sm"><X className="mr-2 h-4 w-4" />Clear Filters</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Customer Data ({filteredData.length})</CardTitle>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleExportPDF}><FileDown className="mr-2 h-4 w-4" />PDF</Button>
                        <Button variant="outline" size="sm" onClick={handleExportExcel}><FileDown className="mr-2 h-4 w-4" />Excel</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {(isLoadingCustomers || isLoadingInvoices) ? (
                        <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Invoice Counts</TableHead>
                                    <TableHead className="text-right">Total Value (Paid)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.length > 0 ? filteredData.map(customer => (
                                    <TableRow key={customer.id}>
                                        <TableCell className="font-medium">
                                            <div>{customer.name}</div>
                                            <div className="text-xs text-muted-foreground">{customer.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                <Badge variant="success">{customer.invoiceCounts.paid} Paid</Badge>
                                                <Badge variant="warning">{customer.invoiceCounts.unpaid + customer.invoiceCounts.pending} Pending</Badge>
                                                <Badge variant="destructive">{customer.invoiceCounts.overdue} Overdue</Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">₹{customer.totalValue.toLocaleString('en-IN')}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={3} className="text-center h-24">No customers match your criteria.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
