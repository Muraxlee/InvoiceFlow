
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'; // Removed RechartsTooltip as ChartTooltip is used
import { DollarSign, Users, ListChecks, FileWarning, Activity, ShoppingBag } from "lucide-react";
import { loadFromLocalStorage } from "@/lib/localStorage";
import type { InvoiceFormValues } from "@/components/invoice-form";
import type { Customer } from "@/app/customers/page";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import PageHeader from '@/components/page-header'; // Added PageHeader import

const INVOICES_STORAGE_KEY = "app_invoices";
const CUSTOMERS_STORAGE_KEY = "app_customers";

interface StoredInvoice extends InvoiceFormValues {
  id: string;
  status: "Paid" | "Pending" | "Overdue" | "Draft";
  amount: number;
}

const chartConfigSales = {
  sales: { label: "Sales", color: "hsl(var(--chart-1))" },
};

export default function DashboardPage() {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [outstandingAmount, setOutstandingAmount] = useState(0);
  const [newCustomersCount, setNewCustomersCount] = useState(0);
  const [pendingInvoicesCount, setPendingInvoicesCount] = useState(0);
  const [recentInvoices, setRecentInvoices] = useState<StoredInvoice[]>([]);
  const [salesData, setSalesData] = useState<{ month: string; sales: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedInvoices = loadFromLocalStorage<StoredInvoice[]>(INVOICES_STORAGE_KEY, []);
    const storedCustomers = loadFromLocalStorage<Customer[]>(CUSTOMERS_STORAGE_KEY, []);

    let revenue = 0;
    let outstanding = 0;
    let pendingCount = 0;
    const monthlySales: { [key: string]: number } = {};

    storedInvoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.invoiceDate); 
      if (invoice.status === "Paid") {
        revenue += invoice.amount;
      } else if (invoice.status === "Pending" || invoice.status === "Overdue") {
        outstanding += invoice.amount;
      }
      if (invoice.status === "Pending") {
        pendingCount++;
      }

      if (invoice.status === "Paid" && !isNaN(invoiceDate.getTime())) {
          const monthYear = format(invoiceDate, "MMM yyyy");
          monthlySales[monthYear] = (monthlySales[monthYear] || 0) + invoice.amount;
      }
    });

    setTotalRevenue(revenue);
    setOutstandingAmount(outstanding);
    setPendingInvoicesCount(pendingCount);
    setNewCustomersCount(storedCustomers.length);

    const sortedInvoices = [...storedInvoices]
        .map(inv => ({...inv, invoiceDate: new Date(inv.invoiceDate)})) 
        .sort((a, b) => b.invoiceDate.getTime() - a.invoiceDate.getTime());
    setRecentInvoices(sortedInvoices.slice(0, 5));
    
    const chartSalesData = Object.entries(monthlySales)
      .map(([month, sales]) => ({ month, sales }))
      .sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime()) 
      .slice(-6); 

    setSalesData(chartSalesData);
    setIsLoading(false);
  }, []);

  const statusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid": return "default";
      case "pending": return "secondary";
      case "overdue": return "destructive";
      case "draft": return "outline";
      default: return "outline";
    }
  };
  
  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
            <Activity className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading dashboard data...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6"> {/* Added space-y-6 for consistent spacing */}
      <PageHeader 
        title="Dashboard Overview" 
        description="A summary of your key business metrics and recent activities."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{totalRevenue.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <p className="text-xs text-muted-foreground">From all paid invoices</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Amount</CardTitle>
            <FileWarning className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{outstandingAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <p className="text-xs text-muted-foreground">From pending & overdue invoices</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle> {/* Changed from "New Customers" */}
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{newCustomersCount}</div> {/* Kept variable name, but title reflects total */}
            <p className="text-xs text-muted-foreground">Total customers registered</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <ListChecks className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingInvoicesCount}</div>
            <p className="text-xs text-muted-foreground">Invoices awaiting payment</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <Card className="lg:col-span-4 shadow-lg">
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
            <CardDescription>Revenue from paid invoices over recent months.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] p-2">
            <ChartContainer config={chartConfigSales} className="w-full h-full">
              <ResponsiveContainer>
                <BarChart data={salesData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.5)" />
                  <XAxis 
                    dataKey="month" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                    tickFormatter={(value) => `₹${value/1000}k`}
                  />
                  <ChartTooltip
                    cursor={{fill: 'hsl(var(--accent)/0.1)'}}
                    content={<ChartTooltipContent 
                        indicator="dot" 
                        formatter={(value, name, props) => {
                            return (
                                <div className="flex flex-col">
                                   <span>{props.payload.month}</span>
                                   <span className="font-bold">₹{Number(value).toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                                </div>
                            )
                        }}
                    />}
                   />
                  <Bar dataKey="sales" fill="var(--color-sales)" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
             {salesData.length === 0 && (
                <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No sales data available to display chart.</p>
                </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest invoices created or updated.</CardDescription>
            </div>
             <Link href="/invoices" passHref>
                <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent className="px-0">
            {recentInvoices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <Link href={`/invoices`} className="hover:underline text-primary">
                          {invoice.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{invoice.customerName}</TableCell>
                      <TableCell>₹{invoice.amount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(invoice.status) as any} className="text-xs">
                          {invoice.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6 text-center">
                <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No recent invoice activity.</p>
                <Link href="/invoices/create" passHref>
                    <Button variant="link" className="mt-2">Create an Invoice</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

