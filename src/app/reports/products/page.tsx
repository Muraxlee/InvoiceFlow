
"use client";

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInvoices, getProducts } from '@/lib/firestore-actions';
import type { Product, StoredInvoice } from '@/types/database';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/page-header';
import { Loader2, Search, X, RefreshCw, ArrowLeft, FileDown } from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type ProductReportData = Product & {
    unitsSold: number;
    totalRevenue: number;
};

export default function ProductReportPage() {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: products, isLoading: isLoadingProducts, refetch: refetchProducts } = useQuery<Product[]>({
        queryKey: ['products'],
        queryFn: getProducts,
    });

    const { data: invoices, isLoading: isLoadingInvoices, refetch: refetchInvoices } = useQuery<StoredInvoice[]>({
        queryKey: ['invoices'],
        queryFn: getInvoices,
    });

    const reportData = useMemo<ProductReportData[]>(() => {
        if (!products || !invoices) return [];

        const productMap = new Map<string, ProductReportData>();
        products.forEach(p => {
            productMap.set(p.id, { ...p, unitsSold: 0, totalRevenue: 0 });
        });

        invoices.forEach(invoice => {
            if (invoice.status === 'Paid' && invoice.items) {
                invoice.items.forEach(item => {
                    if (productMap.has(item.productId)) {
                        const product = productMap.get(item.productId)!;
                        product.unitsSold += item.quantity;
                        product.totalRevenue += item.quantity * item.price;
                    }
                });
            }
        });
        
        return Array.from(productMap.values());
    }, [products, invoices]);

    const filteredData = useMemo(() => {
        const sortedData = [...reportData].sort((a, b) => b.totalRevenue - a.totalRevenue);
        if (!searchTerm) return sortedData;

        const lowercasedTerm = searchTerm.toLowerCase();
        return sortedData.filter(p => 
            p.name.toLowerCase().includes(lowercasedTerm) || 
            p.hsn?.toLowerCase().includes(lowercasedTerm)
        );
    }, [reportData, searchTerm]);

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.text("Product Sales Report", 14, 16);
        autoTable(doc, {
            head: [['Product', 'HSN/SAC', 'Units Sold', 'Total Revenue (₹)']],
            body: filteredData.map(p => [
                p.name,
                p.hsn,
                p.unitsSold,
                p.totalRevenue.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})
            ]),
            startY: 20
        });
        doc.save('product_sales_report.pdf');
    };

    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredData.map(p => ({
            'Product': p.name,
            'HSN/SAC': p.hsn,
            'Units Sold': p.unitsSold,
            'Total Revenue (INR)': p.totalRevenue
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
        XLSX.writeFile(workbook, "product_sales_report.xlsx");
    };

    const handleRefresh = () => {
        refetchProducts();
        refetchInvoices();
    }

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Product Sales Report" 
                description="Analyze the performance of your products and services."
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
                    <CardTitle>Search & Filter</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4">
                    <div className="relative flex-grow">
                       <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                       <Input placeholder="Search by Product Name or HSN/SAC" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                    </div>
                    <Button onClick={() => setSearchTerm('')} variant="ghost" size="sm"><X className="mr-2 h-4 w-4" />Clear</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Product Performance</CardTitle>
                        <CardDescription>Products sorted by total revenue generated from paid invoices.</CardDescription>
                    </div>
                     <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleExportPDF}><FileDown className="mr-2 h-4 w-4" />PDF</Button>
                        <Button variant="outline" size="sm" onClick={handleExportExcel}><FileDown className="mr-2 h-4 w-4" />Excel</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {(isLoadingProducts || isLoadingInvoices) ? (
                        <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>HSN/SAC</TableHead>
                                    <TableHead className="text-center">Units Sold</TableHead>
                                    <TableHead className="text-right">Total Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.length > 0 ? filteredData.map(product => (
                                    <TableRow key={product.id}>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell>{product.hsn}</TableCell>
                                        <TableCell className="text-center">{product.unitsSold}</TableCell>
                                        <TableCell className="text-right">₹{product.totalRevenue.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={4} className="text-center h-24">No products found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
