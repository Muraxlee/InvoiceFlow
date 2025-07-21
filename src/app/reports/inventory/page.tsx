
"use client";

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInventoryItems, getProducts } from '@/lib/firestore-actions';
import type { InventoryItem, Product } from '@/types/database';
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
import { format } from 'date-fns';

export default function InventoryReportPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [minStock, setMinStock] = useState('');
    const [maxStock, setMaxStock] = useState('');

    const { data: inventoryItems, isLoading, refetch } = useQuery<InventoryItem[]>({
        queryKey: ['inventory'],
        queryFn: getInventoryItems,
    });
    
    const { data: products } = useQuery<Product[]>({
        queryKey: ['products'],
        queryFn: getProducts,
    });
    
    const productMap = useMemo(() => {
        if (!products) return new Map<string, Product>();
        return new Map(products.map(p => [p.id, p]));
    }, [products]);

    const filteredData = useMemo(() => {
        if (!inventoryItems) return [];
        return inventoryItems.filter(item => {
            const product = productMap.get(item.productId);
            const lowercasedTerm = searchTerm.toLowerCase();
            if (lowercasedTerm && !item.productName.toLowerCase().includes(lowercasedTerm) && !product?.hsn?.toLowerCase().includes(lowercasedTerm) && !product?.category?.toLowerCase().includes(lowercasedTerm)) {
                return false;
            }
            const min = parseInt(minStock);
            const max = parseInt(maxStock);
            if (!isNaN(min) && item.stock < min) return false;
            if (!isNaN(max) && item.stock > max) return false;
            return true;
        }).sort((a, b) => a.productName.localeCompare(b.productName));
    }, [inventoryItems, searchTerm, minStock, maxStock, productMap]);

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.text("Inventory Stock Report", 14, 16);
        autoTable(doc, {
            head: [['Item Name', 'SKU', 'Category', 'Current Stock', 'Last Updated']],
            body: filteredData.map(item => {
                const product = productMap.get(item.productId);
                return [
                    item.productName,
                    product?.hsn || '-',
                    product?.category || '-',
                    item.stock,
                    item.updatedAt && item.updatedAt.seconds ? format(new Date(item.updatedAt.seconds * 1000), 'dd MMM yyyy, HH:mm') : 'N/A'
                ]
            }),
            startY: 20
        });
        doc.save('inventory_report.pdf');
    };

    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredData.map(item => {
            const product = productMap.get(item.productId);
            return {
                'Item Name': item.productName,
                'SKU': product?.hsn || '-',
                'Category': product?.category || '-',
                'Current Stock': item.stock,
                'Last Updated': item.updatedAt && item.updatedAt.seconds ? format(new Date(item.updatedAt.seconds * 1000), 'dd MMM yyyy, HH:mm') : 'N/A'
            }
        }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
        XLSX.writeFile(workbook, "inventory_report.xlsx");
    };

    const clearFilters = () => {
        setSearchTerm('');
        setMinStock('');
        setMaxStock('');
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Inventory Stock Report" 
                description="View and filter current stock levels for all items."
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
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-2">
                       <label className="text-sm font-medium">Search</label>
                       <div className="relative">
                           <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                           <Input placeholder="Item name, SKU, or category" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                       </div>
                    </div>
                    <div>
                       <label className="text-sm font-medium">Min Stock</label>
                       <Input type="number" placeholder="e.g., 0" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
                    </div>
                    <div>
                       <label className="text-sm font-medium">Max Stock</label>
                       <Input type="number" placeholder="e.g., 50" value={maxStock} onChange={(e) => setMaxStock(e.target.value)} />
                    </div>
                    <div className="lg:col-span-4">
                        <Button onClick={clearFilters} variant="ghost" size="sm"><X className="mr-2 h-4 w-4" />Clear Filters</Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle>Inventory Items ({filteredData.length})</CardTitle>
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
                                    <TableHead>Product Name</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-center">Current Stock</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.length > 0 ? filteredData.map(item => {
                                    const product = productMap.get(item.productId);
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.productName}</TableCell>
                                            <TableCell>{product?.hsn || '-'}</TableCell>
                                            <TableCell>{product?.category || '-'}</TableCell>
                                            <TableCell className="text-center font-bold">{item.stock}</TableCell>
                                        </TableRow>
                                    )
                                }) : (
                                    <TableRow><TableCell colSpan={4} className="text-center h-24">No inventory items match your criteria.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
