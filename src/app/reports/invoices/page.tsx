
"use client";

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInvoices } from '@/lib/firestore-actions';
import type { StoredInvoice } from '@/types/database';
import { format, isPast, startOfDay } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/page-header';
import { Loader2, Search, X } from 'lucide-react';
import Link from 'next/link';

type StatusFilter = "all" | "paid" | "unpaid" | "pending" | "overdue";

export default function InvoiceReportPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');

    const { data: invoices, isLoading } = useQuery<StoredInvoice[]>({
        queryKey: ['invoices'],
        queryFn: getInvoices,
    });

    const filteredInvoices = useMemo(() => {
        if (!invoices) return [];
        const today = startOfDay(new Date());

        return invoices.filter(invoice => {
            let status = invoice.status || 'Unpaid';
            if (invoice.dueDate && isPast(new Date(invoice.dueDate)) && ['Unpaid', 'Pending', 'Partially Paid'].includes(status)) {
                status = 'Overdue';
            }

            if (statusFilter !== 'all' && status.toLowerCase() !== statusFilter) {
                return false;
            }

            const lowercasedTerm = searchTerm.toLowerCase();
            if (lowercasedTerm && !invoice.customerName.toLowerCase().includes(lowercasedTerm) && !invoice.invoiceNumber.toLowerCase().includes(lowercasedTerm)) {
                return false;
            }

            const min = parseFloat(minAmount);
            const max = parseFloat(maxAmount);
            if (!isNaN(min) && invoice.amount < min) return false;
            if (!isNaN(max) && invoice.amount > max) return false;

            return true;
        });
    }, [invoices, searchTerm, statusFilter, minAmount, maxAmount]);

    const getStatusBadge = (invoice: StoredInvoice) => {
        let status = invoice.status || 'Unpaid';
        if (invoice.dueDate && isPast(new Date(invoice.dueDate)) && ['Unpaid', 'Pending', 'Partially Paid'].includes(status)) {
            status = 'Overdue';
        }

        const variant = status.toLowerCase() === 'paid' ? 'success' :
                        status.toLowerCase() === 'overdue' ? 'destructive' :
                        status.toLowerCase() === 'pending' || status.toLowerCase() === 'unpaid' ? 'warning' :
                        status.toLowerCase() === 'partially paid' ? 'info' :
                        'outline';
        return <Badge variant={variant as any}>{status}</Badge>;
    };
    
    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setMinAmount('');
        setMaxAmount('');
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Invoice Report" description="Filter and analyze your invoices." />
            <Card>
                <CardHeader>
                    <CardTitle>Filters & Search</CardTitle>
                    <CardDescription>Use the controls below to refine the invoice list.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                           <label className="text-sm font-medium">Search</label>
                           <div className="relative">
                               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                               <Input placeholder="Customer or Invoice #" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-sm font-medium">Status</label>
                           <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                               <SelectTrigger><SelectValue /></SelectTrigger>
                               <SelectContent>
                                   <SelectItem value="all">All</SelectItem>
                                   <SelectItem value="paid">Paid</SelectItem>
                                   <SelectItem value="unpaid">Unpaid</SelectItem>
                                   <SelectItem value="pending">Pending</SelectItem>
                                   <SelectItem value="overdue">Overdue</SelectItem>
                               </SelectContent>
                           </Select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-sm font-medium">Min Amount (₹)</label>
                           <Input type="number" placeholder="e.g., 1000" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                           <label className="text-sm font-medium">Max Amount (₹)</label>
                           <Input type="number" placeholder="e.g., 5000" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
                        </div>
                    </div>
                    <Button onClick={clearFilters} variant="ghost" size="sm"><X className="mr-2 h-4 w-4" />Clear Filters</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Filtered Invoices ({filteredInvoices.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Invoice #</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredInvoices.length > 0 ? filteredInvoices.map(invoice => (
                                    <TableRow key={invoice.id}>
                                        <TableCell><Link href={`/invoices/${invoice.id}`} className="font-medium text-primary hover:underline">{invoice.invoiceNumber}</Link></TableCell>
                                        <TableCell>{invoice.customerName}</TableCell>
                                        <TableCell>{format(new Date(invoice.invoiceDate), 'dd MMM yyyy')}</TableCell>
                                        <TableCell>{getStatusBadge(invoice)}</TableCell>
                                        <TableCell className="text-right">₹{invoice.amount.toLocaleString('en-IN')}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} className="text-center h-24">No invoices match your criteria.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
