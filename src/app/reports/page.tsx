
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Sparkles, Loader2, DollarSign, FileText, TrendingUp, AlertTriangle, Users, Package, BarChartHorizontalBig, Activity } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { SalesEnhancementInput } from "@/ai/flows/sales-enhancement-flow";
import { getSalesEnhancementSuggestions } from "@/ai/flows/sales-enhancement-flow";
import type { StoredInvoice, User, Customer as DbCustomer, Product as DbProduct } from "@/lib/database"; // Assuming types are exported from database
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import PageHeader from "@/components/page-header";

interface ReportData {
  totalRevenue: number;
  totalUnpaid: number;
  totalInvoices: number;
  averageInvoiceValue: number;
  paymentStatusCounts: { [key: string]: number };
  monthlySalesData: { month: string; sales: number }[];
  topCustomers: { name: string; totalAmount: number; id: string }[];
  topProducts: { name:string; totalAmount: number; id: string }[];
}

const initialReportData: ReportData = {
  totalRevenue: 0,
  totalUnpaid: 0,
  totalInvoices: 0,
  averageInvoiceValue: 0,
  paymentStatusCounts: {},
  monthlySalesData: [],
  topCustomers: [],
  topProducts: [],
};

const chartConfig = {
  sales: { label: "Sales", color: "hsl(var(--chart-1))" },
};

export default function ReportsPage() {
  const { toast } = useToast();
  const [salesSuggestions, setSalesSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  
  const [reportData, setReportData] = useState<ReportData>(initialReportData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDataAndProcessReports() {
      setIsLoading(true);
      setError(null);
      try {
        if (!window.electronAPI) {
          setError("Electron API not available. This page requires the desktop application environment.");
          setIsLoading(false);
          return;
        }

        const [invoices, customers, products] = await Promise.all([
          window.electronAPI.getAllInvoices(),
          window.electronAPI.getAllCustomers(),
          window.electronAPI.getAllProducts(),
        ]);

        // Process data
        let totalRevenue = 0;
        let totalUnpaid = 0;
        const paymentStatusCounts: { [key: string]: number } = {};
        const monthlySales: { [key: string]: number } = {}; // Key: YYYY-MM

        invoices.forEach(inv => {
          const invoiceDate = new Date(inv.invoiceDate); // Ensure date is parsed
          const status = inv.status || "Unknown";
          paymentStatusCounts[status] = (paymentStatusCounts[status] || 0) + 1;

          if (inv.status === "Paid") {
            totalRevenue += inv.amount;
            const monthKey = format(invoiceDate, "yyyy-MM");
            monthlySales[monthKey] = (monthlySales[monthKey] || 0) + inv.amount;
          } else if (["Pending", "Unpaid", "Overdue", "Draft"].includes(inv.status)) {
            totalUnpaid += inv.amount;
          }
        });

        const totalInvoices = invoices.length;
        const paidInvoicesCount = paymentStatusCounts["Paid"] || 0;
        const averageInvoiceValue = paidInvoicesCount > 0 ? totalRevenue / paidInvoicesCount : 0;

        // Prepare last 12 months sales data
        const monthlySalesData: { month: string; sales: number }[] = [];
        for (let i = 11; i >= 0; i--) {
          const date = subMonths(new Date(), i);
          const monthKey = format(date, "yyyy-MM");
          const monthName = format(date, "MMM yyyy");
          monthlySalesData.push({
            month: monthName,
            sales: monthlySales[monthKey] || 0,
          });
        }
        
        // Top Customers
        const customerSales: { [id: string]: number } = {};
        invoices.forEach(inv => {
          if (inv.status === "Paid") {
            customerSales[inv.customerId] = (customerSales[inv.customerId] || 0) + inv.amount;
          }
        });
        const topCustomers = Object.entries(customerSales)
          .map(([id, totalAmount]) => {
            const customer = customers.find(c => c.id === id);
            return { id, name: customer?.name || "Unknown Customer", totalAmount };
          })
          .sort((a, b) => b.totalAmount - a.totalAmount)
          .slice(0, 5);

        // Top Products
        const productSales: { [id: string]: number } = {};
        invoices.forEach(inv => {
          if (inv.status === "Paid") {
            inv.items.forEach(item => {
              const itemTotal = (item.quantity || 0) * (item.price || 0);
              productSales[item.productId] = (productSales[item.productId] || 0) + itemTotal;
            });
          }
        });
        const topProducts = Object.entries(productSales)
          .map(([id, totalAmount]) => {
            const product = products.find(p => p.id === id);
            return { id, name: product?.name || "Unknown Product", totalAmount };
          })
          .sort((a, b) => b.totalAmount - a.totalAmount)
          .slice(0, 5);

        setReportData({
          totalRevenue,
          totalUnpaid,
          totalInvoices,
          averageInvoiceValue,
          paymentStatusCounts,
          monthlySalesData,
          topCustomers,
          topProducts,
        });

      } catch (err) {
        console.error("Error fetching or processing report data:", err);
        setError("Failed to load report data. Please try again.");
        toast({ title: "Error", description: "Could not load report data.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchDataAndProcessReports();
  }, [toast]);
  
  const handleGetSalesSuggestions = async () => {
    setIsGeneratingSuggestions(true);
    setSuggestionError(null);
    setSalesSuggestions([]);
    try {
       if (!window.electronAPI) {
        setSuggestionError("Electron API not available for AI suggestions.");
        setIsGeneratingSuggestions(false);
        return;
      }
      // Using already fetched and processed reportData for context
      const productSummary = reportData.topProducts.length > 0 
        ? `Top products: ${reportData.topProducts.map(p => p.name).join(", ")}.`
        : "No specific product sales data available from recent reports.";

      const input: SalesEnhancementInput = { 
        businessContext: "A business using InvoiceFlow for managing invoices, customers, and products, seeking to improve sales performance.",
        totalRevenue: reportData.totalRevenue,
        invoiceCount: reportData.totalInvoices,
        customerCount: reportData.topCustomers.length > 0 ? undefined : 0, // Placeholder, ideally total customer count
        productSummary: productSummary,
      };
      const result = await getSalesEnhancementSuggestions(input);
      setSalesSuggestions(result.suggestions);
      toast({
        title: "AI Suggestions Received",
        description: "Sales enhancement suggestions have been generated based on your data.",
      });
    } catch (error) {
      console.error("Error generating sales suggestions:", error);
      setSuggestionError("Failed to generate sales suggestions. Please try again. Ensure your API key is set correctly in .env and the server is restarted.");
      toast({
        title: "Error",
        description: "Could not fetch sales suggestions. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading reports data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="mt-4 text-destructive">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Business Reports & Insights"
        description="An overview of your key business metrics, sales trends, and AI-powered advice."
      />

      {/* Key Metrics Summary */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{reportData.totalRevenue.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <p className="text-xs text-muted-foreground">From all paid invoices</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unpaid</CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{reportData.totalUnpaid.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <p className="text-xs text-muted-foreground">Pending, overdue, draft</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{reportData.totalInvoices}</div>
            <p className="text-xs text-muted-foreground">Total invoices issued</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Invoice Value</CardTitle>
            <Activity className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{reportData.averageInvoiceValue.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <p className="text-xs text-muted-foreground">Average of paid invoices</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Sales Trend Chart & Payment Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>Sales Trend (Last 12 Months)</CardTitle>
            <CardDescription>Revenue from paid invoices over time.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] p-2">
            {reportData.monthlySalesData.length > 0 ? (
              <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer>
                  <BarChart data={reportData.monthlySalesData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.5)" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(value) => `₹${value/1000}k`} />
                    <ChartTooltip
                      cursor={{fill: 'hsl(var(--accent)/0.1)'}}
                      content={<ChartTooltipContent indicator="dot" 
                        formatter={(value, name, props) => (
                            <div className="flex flex-col">
                               <span>{props.payload.month}</span>
                               <span className="font-bold">₹{Number(value).toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                            </div>
                        )}
                      />}
                    />
                    <Bar dataKey="sales" fill="var(--color-sales)" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No sales data available for the chart.</p></div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Payment Status Overview</CardTitle>
            <CardDescription>Breakdown of invoice statuses.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(reportData.paymentStatusCounts).length > 0 ? 
              Object.entries(reportData.paymentStatusCounts).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/30">
                  <span className="font-medium capitalize">{status}</span>
                  <span className="font-semibold text-primary">{count} {count === 1 ? "Invoice" : "Invoices"}</span>
                </div>
              )) : <p className="text-muted-foreground text-sm">No invoice status data available.</p>
            }
          </CardContent>
        </Card>
      </div>

      {/* Top Customers and Top Products */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary"/>Top Customers (by Revenue)</CardTitle>
            <CardDescription>Your most valuable customers based on paid invoices.</CardDescription>
          </CardHeader>
          <CardContent>
            {reportData.topCustomers.length > 0 ? (
              <Table>
                <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead className="text-right">Total Billed</TableHead></TableRow></TableHeader>
                <TableBody>
                  {reportData.topCustomers.map(customer => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="text-right font-semibold">₹{customer.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">No customer sales data available.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-primary"/>Top Products (by Revenue)</CardTitle>
            <CardDescription>Your best-selling products/services from paid invoices.</CardDescription>
          </CardHeader>
          <CardContent>
             {reportData.topProducts.length > 0 ? (
              <Table>
                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Total Revenue</TableHead></TableRow></TableHeader>
                <TableBody>
                  {reportData.topProducts.map(product => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-right font-semibold">₹{product.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">No product sales data available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Sales Advisor Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-xl">AI Sales Advisor</CardTitle>
              <CardDescription>Get actionable suggestions from AI, tailored to your business data, to help boost sales and identify opportunities.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGetSalesSuggestions} disabled={isGeneratingSuggestions} className="mb-4">
            {isGeneratingSuggestions ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Get Sales Suggestions
          </Button>
          {suggestionError && (
            <p className="text-sm text-destructive">{suggestionError}</p>
          )}
          {salesSuggestions.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Here are some suggestions based on your data:</h4>
              <ul className="list-disc list-inside pl-4 space-y-1 text-sm text-muted-foreground">
                {salesSuggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
          {isGeneratingSuggestions && !salesSuggestions.length && (
             <div className="flex items-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating insights based on your current data... Please wait.
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    