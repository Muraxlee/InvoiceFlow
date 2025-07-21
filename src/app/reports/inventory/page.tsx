
"use client";

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInventoryItems } from '@/lib/firestore-actions';
import type { InventoryItem } from '@/types/database';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/page-header';
import { Loader2, Search, X, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function InventoryReportPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [minStock, setMinStock] = useState('');
    const [maxStock, setMaxStock] = useState('');

    const { data: inventoryItems, isLoading, refetch } = useQuery<InventoryItem[]>({
        queryKey: ['inventory'],
        queryFn: getInventoryItems,
    });

    const filteredData = useMemo(() => {
        if (!inventoryItems) return [];
        return inventoryItems.filter(item => {
            const lowercasedTerm = searchTerm.toLowerCase();
            if (lowercasedTerm && !item.name.toLowerCase().includes(lowercasedTerm) && !item.sku.toLowerCase().includes(lowercasedTerm) && !item.category.toLowerCase().includes(lowercasedTerm)) {
                return false;
            }
            const min = parseInt(minStock);
            const max = parseInt(maxStock);
            if (!isNaN(min) && item.stock < min) return false;
            if (!isNaN(max) && item.stock > max) return false;
            return true;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [inventoryItems, searchTerm, minStock, maxStock]);

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
                <CardHeader>
                    <CardTitle>Inventory Items ({filteredData.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item Name</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-center">Current Stock</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.length > 0 ? filteredData.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>{item.sku}</TableCell>
                                        <TableCell>{item.category}</TableCell>
                                        <TableCell className="text-center font-bold">{item.stock}</TableCell>
                                    </TableRow>
                                )) : (
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
