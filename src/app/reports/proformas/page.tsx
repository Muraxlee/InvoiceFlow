
"use client";

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInvoices } from '@/lib/firestore-actions';
import type { StoredInvoice } from '@/types/database';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/page-header';
import { Loader2, Search, X, RefreshCw, ArrowLeft, FileDown, CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

export default function ProformaReportPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();

    const { data: invoices, isLoading, refetch } = useQuery<StoredInvoice[]>({
        queryKey: ['invoices'],
        queryFn: getInvoices,
    });

    const filteredProformas = useMemo(() => {
        if (!invoices) return [];
        return invoices.filter(invoice => {
            if (invoice.type !== 'Proforma Invoice') {
                return false;
            }

            const lowercasedTerm = searchTerm.toLowerCase();
            if (lowercasedTerm && !invoice.customerName.toLowerCase().includes(lowercasedTerm) && !invoice.invoiceNumber.toLowerCase().includes(lowercasedTerm)) {
                return false;
            }

            const invoiceDate = new Date(invoice.invoiceDate);
            if (startDate && invoiceDate < startOfDay(startDate)) return false;
            if (endDate && invoiceDate > endOfDay(endDate)) return false;

            return true;
        });
    }, [invoices, searchTerm, startDate, endDate]);

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.text("Proforma Invoice Report", 14, 16);
        autoTable(doc, {
            head: [['Proforma #', 'Customer', 'Date', 'Amount (₹)']],
            body: filteredProformas.map(inv => [
                inv.invoiceNumber,
                inv.customerName,
                format(new Date(inv.invoiceDate), 'dd MMM yyyy'),
                inv.amount.toLocaleString('en-IN')
            ]),
            startY: 20
        });
        doc.save('proforma_report.pdf');
    };

    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredProformas.map(inv => ({
            'Proforma #': inv.invoiceNumber,
            'Customer': inv.customerName,
            'Date': format(new Date(inv.invoiceDate), 'dd MMM yyyy'),
            'Amount (INR)': inv.amount
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Proforma Invoices");
        XLSX.writeFile(workbook, "proforma_report.xlsx");
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStartDate(undefined);
        setEndDate(undefined);
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Proforma Invoice Report" 
                description="Filter and view all your proforma invoices."
                actions={
                  <div className="flex items-center gap-2">
                    <Link href="/reports">
                      <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                    </Link>
                    <Button onClick={() => refetch()} variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
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
                           <label className="text-sm font-medium">Search</label>
                           <div className="relative">
                               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                               <Input placeholder="Customer or Proforma #" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                           </div>
                        </div>
                         <div className="space-y-2">
                           <label className="text-sm font-medium">Start Date</label>
                           <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {startDate ? format(startDate, "PPP") : <span>Pick a start date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                            </PopoverContent>
                           </Popover>
                        </div>
                        <div className="space-y-2">
                           <label className="text-sm font-medium">End Date</label>
                           <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {endDate ? format(endDate, "PPP") : <span>Pick an end date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                            </PopoverContent>
                           </Popover>
                        </div>
                    </div>
                    <Button onClick={clearFilters} variant="ghost" size="sm"><X className="mr-2 h-4 w-4" />Clear Filters</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle>Proforma Invoices ({filteredProformas.length})</CardTitle>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleExportPDF}><FileDown className="mr-2 h-4 w-4" />PDF</Button>
                        <Button variant="outline" size="sm" onClick={handleExportExcel}><FileDown className="mr-2 h-4 w-4" />Excel</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Proforma #</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProformas.length > 0 ? filteredProformas.map(invoice => (
                                    <TableRow key={invoice.id}>
                                        <TableCell><Link href={`/invoices/${invoice.id}`} className="font-medium text-primary hover:underline">{invoice.invoiceNumber}</Link></TableCell>
                                        <TableCell>{invoice.customerName}</TableCell>
                                        <TableCell>{format(new Date(invoice.invoiceDate), 'dd MMM yyyy')}</TableCell>
                                        <TableCell className="text-right">₹{invoice.amount.toLocaleString('en-IN')}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={4} className="text-center h-24">No proforma invoices match your criteria.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
