
"use client";

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMeasurements } from '@/lib/firestore-actions';
import type { Measurement } from '@/types/database';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/page-header';
import { Loader2, Search, X, RefreshCw, ArrowLeft, FileDown } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function MeasurementsReportPage() {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: measurements, isLoading, refetch } = useQuery<Measurement[]>({
        queryKey: ['measurements'],
        queryFn: getMeasurements,
    });

    const filteredData = useMemo(() => {
        if (!measurements) return [];
        return measurements.filter(item => {
            const lowercasedTerm = searchTerm.toLowerCase();
            if (!lowercasedTerm) return true;
            return item.customerName.toLowerCase().includes(lowercasedTerm) ||
                   item.uniqueId.toLowerCase().includes(lowercasedTerm) ||
                   item.type.toLowerCase().includes(lowercasedTerm) ||
                   (item.customType || '').toLowerCase().includes(lowercasedTerm);
        }).sort((a, b) => new Date(b.recordedDate).getTime() - new Date(a.recordedDate).getTime());
    }, [measurements, searchTerm]);

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.text("Measurement Records Report", 14, 16);
        autoTable(doc, {
            head: [['Record ID', 'Customer', 'Garment Type', 'Date Recorded', 'Fields']],
            body: filteredData.map(item => [
                item.uniqueId,
                item.customerName,
                item.type === 'Custom' ? item.customType : item.type,
                format(new Date(item.recordedDate), 'dd MMM yyyy'),
                item.values.length.toString()
            ]),
            startY: 20
        });
        doc.save('measurement_records_report.pdf');
    };

    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredData.map(item => ({
            'Record ID': item.uniqueId,
            'Customer': item.customerName,
            'Garment Type': item.type === 'Custom' ? item.customType : item.type,
            'Date Recorded': format(new Date(item.recordedDate), 'dd MMM yyyy'),
            'Field Count': item.values.length
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Measurements");
        XLSX.writeFile(workbook, "measurement_records_report.xlsx");
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Measurement Records Report" 
                description="Search and review all saved measurement records."
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
                    <CardTitle>Search & Filter</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4">
                    <div className="relative flex-grow">
                       <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                       <Input placeholder="Search by Customer, Record ID, or Type" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                    </div>
                    <Button onClick={() => setSearchTerm('')} variant="ghost" size="sm"><X className="mr-2 h-4 w-4" />Clear</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle>Measurement Records ({filteredData.length})</CardTitle>
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
                                    <TableHead>Record ID</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Garment Type</TableHead>
                                    <TableHead>Date Recorded</TableHead>
                                    <TableHead className="text-center">Fields</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.length > 0 ? filteredData.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-mono text-xs">
                                          <Link href={`/measurements/${item.id}`} className="text-primary hover:underline">{item.uniqueId}</Link>
                                        </TableCell>
                                        <TableCell className="font-medium">{item.customerName}</TableCell>
                                        <TableCell><Badge variant="outline">{item.type === 'Custom' ? item.customType : item.type}</Badge></TableCell>
                                        <TableCell>{format(new Date(item.recordedDate), 'dd MMM yyyy')}</TableCell>
                                        <TableCell className="text-center">{item.values.length}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} className="text-center h-24">No records match your criteria.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
