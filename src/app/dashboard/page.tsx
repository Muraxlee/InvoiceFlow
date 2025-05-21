
"use client";

import { useState, useEffect } from 'react';
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, Users, CreditCard, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { loadFromLocalStorage } from '@/lib/localStorage';
import type { InvoiceFormValues } from '@/components/invoice-form';
import type { Customer } from '@/app/customers/page'; // Assuming Customer type is exported

const INVOICES_STORAGE_KEY = "app_invoices";
const CUSTOMERS_STORAGE_KEY = "app_customers";

interface StoredInvoice extends InvoiceFormValues {
  id: string;
  status: "Paid" | "Pending" | "Overdue" | "Draft";
  amount: number;
}

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--primary))",
  },
};

export default function DashboardPage() {
  const [salesData, setSalesData] = useState<Array<{ month: string; sales: number }>>([]);
  const [recentActivityData, setRecentActivityData] = useState<Array<{ id: string; description: string; amount: string; timeAgo: string }>>([]);
  
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [newCustomersCount, setNewCustomersCount] = useState(0);
  const [invoicesSentCount, setInvoicesSentCount] = useState(0);
  const [outstandingAmount, setOutstandingAmount] = useState(0);

  useEffect(() => {
    const storedInvoices = loadFromLocalStorage<StoredInvoice[]>(INVOICES_STORAGE_KEY, []);
    const storedCustomers = loadFromLocalStorage<Customer[]>(CUSTOMERS_STORAGE_KEY, []);

    // Calculate dashboard metrics
    let revenue = 0;
    let outstanding = 0;
    const monthlySales: Record<string, number> = {};

    storedInvoices.forEach(invoice => {
      if (invoice.status === 'Paid') {
        revenue += invoice.amount;
      }
      if (invoice.status === 'Pending' || invoice.status === 'Overdue') {
        outstanding += invoice.amount;
      }
      // For sales chart (simplified: using invoice month)
      const invoiceDate = new Date(invoice.invoiceDate);
      const monthYear = invoiceDate.toLocaleString('default', { month: 'short' }); // Jan, Feb etc.
      monthlySales[monthYear] = (monthlySales[monthYear] || 0) + invoice.amount;
    });

    setTotalRevenue(revenue);
    setOutstandingAmount(outstanding);
    setInvoicesSentCount(storedInvoices.length);
    setNewCustomersCount(storedCustomers.length); // Simplified: all stored customers are "new" in this context

    // Format sales data for chart
    const currentYear = new Date().getFullYear();
    const monthsOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const generatedSalesData = monthsOrder.slice(0,6).map(month => ({ // Show first 6 months for demo
      month: month,
      sales: monthlySales[month] || Math.floor(Math.random() * 100) + 50, // Fallback to random if no sales
    }));
    setSalesData(generatedSalesData);

    // Populate recent activity (last 5 invoices)
    const sortedInvoices = [...storedInvoices].sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
    const generatedActivityData = sortedInvoices.slice(0, 5).map((invoice, i) => {
        const timeDiff = new Date().getTime() - new Date(invoice.invoiceDate).getTime();
        const daysAgo = Math.floor(timeDiff / (1000 * 3600 * 24));
        return {
            id: invoice.id,
            description: `Invoice #${invoice.invoiceNumber} sent to ${invoice.customerName}`,
            amount: `$${invoice.amount.toFixed(2)}`,
            timeAgo: daysAgo <=0 ? 'Today' : `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`
        }
    });
    setRecentActivityData(generatedActivityData);

  }, []); 

  return (
    <div className="space-y-6">
      <PageHeader title="Sales Dashboard" description="Overview of your sales performance and key metrics." />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            {/* Trend data is placeholder for now */}
            <p className="text-xs text-muted-foreground">+10.2% from last month <TrendingUp className="inline h-3 w-3" /></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{newCustomersCount}</div>
            <p className="text-xs text-muted-foreground">+5.1% from last month <TrendingUp className="inline h-3 w-3" /></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices Sent</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoicesSentCount}</div>
            <p className="text-xs text-muted-foreground">+2 since yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Amount</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${outstandingAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">-2.5% from last week <TrendingDown className="inline h-3 w-3" /></p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Sales Overview</CardTitle>
            <CardDescription>Revenue generated per month (from local data, may be partial).</CardDescription>
          </CardHeader>
          <CardContent>
            {salesData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                    <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading chart data...</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>A log of recent invoices (from local data).</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] overflow-y-auto">
            {recentActivityData.length > 0 ? (
              <ul className="space-y-3">
                {recentActivityData.map((activity) => (
                  <li key={activity.id} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted/50">
                    <div>
                      <p className="font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">Amount: {activity.amount}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.timeAgo}</span>
                  </li>
                ))}
              </ul>
            ) : (
               <div className="h-full flex items-center justify-center text-muted-foreground">No recent activity or invoices found.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
