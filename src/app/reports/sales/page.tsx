
"use client";

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInvoices } from '@/lib/firestore-actions';
import type { StoredInvoice } from '@/types/database';
import { format, subMonths, isPast } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import PageHeader from '@/components/page-header';
import { Loader2, DollarSign, FileText, AlertTriangle, BarChartHorizontalBig, RefreshCw, ArrowLeft, FileDown } from "lucide-react";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface SalesReportData {
  totalRevenue: number;
  totalUnpaid: number;
  totalInvoices: number;
  averageInvoiceValue: number;
  monthlySalesData: { month: string; sales: number; unpaid: number }[];
}

export default function SalesReportPage() {
    const { data: invoices, isLoading, refetch } = useQuery<StoredInvoice[]>({
        queryKey: ['invoices'],
        queryFn: getInvoices,
    });

    const reportData = useMemo<SalesReportData | null>(() => {
        if (!invoices) return null;
        
        let totalRevenue = 0;
        let totalUnpaid = 0;
        const monthlySales: { [key: string]: { sales: number; unpaid: number } } = {};

        invoices.forEach(inv => {
            const invoiceDate = new Date(inv.invoiceDate);
            let status = inv.status || "Unpaid";

            const isOverdue = inv.dueDate && isPast(new Date(inv.dueDate)) && ['Unpaid', 'Pending', 'Partially Paid'].includes(status);
            if (isOverdue) {
                status = 'Overdue';
            }

            const monthKey = format(invoiceDate, "yyyy-MM");
            if (!monthlySales[monthKey]) {
                monthlySales[monthKey] = { sales: 0, unpaid: 0 };
            }

            if (status === "Paid") {
                totalRevenue += inv.amount || 0;
                monthlySales[monthKey].sales += inv.amount || 0;
            } else if (["Pending", "Unpaid", "Overdue", "Draft", "Partially Paid"].includes(status)) {
                totalUnpaid += inv.amount || 0;
                monthlySales[monthKey].unpaid += inv.amount || 0;
            }
        });

        const paidInvoicesCount = invoices.filter(inv => inv.status === "Paid").length;
        const averageInvoiceValue = paidInvoicesCount > 0 ? totalRevenue / paidInvoicesCount : 0;
        
        const monthlySalesData: { month: string; sales: number; unpaid: number }[] = [];
        for (let i = 11; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            const monthKey = format(date, "yyyy-MM");
            const monthName = format(date, "MMM yyyy");
            monthlySalesData.push({
                month: monthName,
                sales: monthlySales[monthKey]?.sales || 0,
                unpaid: monthlySales[monthKey]?.unpaid || 0,
            });
        }

        return {
            totalRevenue,
            totalUnpaid,
            totalInvoices: invoices.length,
            averageInvoiceValue,
            monthlySalesData
        };
    }, [invoices]);

    const handleExportPDF = () => {
        if (!reportData) return;
        const doc = new jsPDF();
        doc.text("Sales Report", 14, 16);
        
        const summary = [
            ["Total Revenue", `Rs. ${reportData.totalRevenue.toLocaleString('en-IN')}`],
            ["Total Unpaid", `Rs. ${reportData.totalUnpaid.toLocaleString('en-IN')}`],
            ["Total Invoices", reportData.totalInvoices.toString()],
            ["Average Sale Value", `Rs. ${reportData.averageInvoiceValue.toLocaleString('en-IN')}`],
        ];
        autoTable(doc, { head: [['Metric', 'Value']], body: summary, startY: 20 });

        autoTable(doc, {
            head: [['Month', 'Paid Revenue (₹)', 'Unpaid/Pending (₹)']],
            body: reportData.monthlySalesData.map(d => [
                d.month,
                d.sales.toLocaleString('en-IN'),
                d.unpaid.toLocaleString('en-IN')
            ]),
            startY: (doc as any).lastAutoTable.finalY + 10,
            didDrawPage: (data) => {
                if (data.pageNumber === 1) {
                    doc.text("Monthly Sales Performance", 14, (doc as any).lastAutoTable.finalY + 5);
                }
            }
        });

        doc.save('sales_report.pdf');
    };

    const handleExportExcel = () => {
        if (!reportData) return;
        const summaryWs = XLSX.utils.json_to_sheet([
            { Metric: 'Total Revenue', Value: reportData.totalRevenue },
            { Metric: 'Total Unpaid', Value: reportData.totalUnpaid },
            { Metric: 'Total Invoices', Value: reportData.totalInvoices },
            { Metric: 'Average Sale Value', Value: reportData.averageInvoiceValue },
        ]);
        const monthlyWs = XLSX.utils.json_to_sheet(reportData.monthlySalesData.map(d => ({
            'Month': d.month,
            'Paid Revenue (INR)': d.sales,
            'Unpaid/Pending (INR)': d.unpaid,
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");
        XLSX.utils.book_append_sheet(wb, monthlyWs, "Monthly Sales");
        XLSX.writeFile(wb, "sales_report.xlsx");
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!reportData) {
        return <p>No data to generate sales report.</p>;
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Sales Report"
                description="Analyze your revenue and sales trends over time."
                actions={
                  <div className="flex items-center gap-2">
                    <Link href="/reports">
                      <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                    </Link>
                    <Button onClick={() => refetch()} variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
                  </div>
                }
            />
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Revenue</CardTitle><DollarSign className="h-4 w-4 text-green-500" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">₹{reportData.totalRevenue.toLocaleString('en-IN')}</div><p className="text-xs text-muted-foreground">From all paid invoices</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Unpaid</CardTitle><AlertTriangle className="h-4 w-4 text-amber-500" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">₹{reportData.totalUnpaid.toLocaleString('en-IN')}</div><p className="text-xs text-muted-foreground">From pending/unpaid invoices</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Invoices</CardTitle><FileText className="h-4 w-4 text-blue-500" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{reportData.totalInvoices}</div><p className="text-xs text-muted-foreground">Across all statuses</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Average Sale</CardTitle><BarChartHorizontalBig className="h-4 w-4 text-purple-500" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">₹{reportData.averageInvoiceValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div><p className="text-xs text-muted-foreground">Average value of paid invoices</p></CardContent>
              </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Monthly Sales Performance (Last 12 Months)</CardTitle>
                        <CardDescription>Comparison of paid revenue vs. newly generated unpaid amounts each month.</CardDescription>
                    </div>
                     <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleExportPDF}><FileDown className="mr-2 h-4 w-4" />PDF</Button>
                        <Button variant="outline" size="sm" onClick={handleExportExcel}><FileDown className="mr-2 h-4 w-4" />Excel</Button>
                    </div>
                </CardHeader>
                <CardContent className="h-[400px] p-2">
                    <ChartContainer config={{}} className="w-full h-full">
                        <ResponsiveContainer>
                            <BarChart data={reportData.monthlySalesData}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `₹${Number(value) / 1000}k`} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Paid Revenue" />
                                <Bar dataKey="unpaid" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} name="Unpaid/Pending" />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    );
}
