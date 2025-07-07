
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Sparkles, Loader2, DollarSign, FileText, TrendingUp, AlertTriangle, Users, Package, BarChartHorizontalBig, Activity, RefreshCw, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { SalesEnhancementInput } from "@/ai/flows/sales-enhancement-flow";
import { getSalesEnhancementSuggestions } from "@/ai/flows/sales-enhancement-flow";
import type { StoredInvoice, Customer, Product } from "@/types/database";
import { format, subMonths } from 'date-fns';
import PageHeader from "@/components/page-header";
import Link from "next/link";
import { useQuery } from '@tanstack/react-query';
import { getInvoices, getCustomers, getProducts } from '@/lib/firestore-actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

export default function ReportsPage() {
  const { toast } = useToast();
  const [salesSuggestions, setSalesSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['reportData'],
    queryFn: async () => {
      const [invoices, customers, products] = await Promise.all([
        getInvoices(),
        getCustomers(),
        getProducts(),
      ]);
      return { invoices, customers, products };
    }
  });

  const reportData = useMemo<ReportData | null>(() => {
    if (!data) return null;
    
    const { invoices, customers, products } = data;

    let totalRevenue = 0;
    let totalUnpaid = 0;
    const paymentStatusCounts: { [key: string]: number } = {};
    const monthlySales: { [key: string]: number } = {};

    invoices.forEach(inv => {
      const invoiceDate = new Date(inv.invoiceDate);
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

    const productSales: { [id: string]: number } = {};
    invoices.forEach(inv => {
      if (inv.status === "Paid" && inv.items && Array.isArray(inv.items)) {
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

    return {
      totalRevenue,
      totalUnpaid,
      totalInvoices,
      averageInvoiceValue,
      paymentStatusCounts,
      monthlySalesData,
      topCustomers,
      topProducts,
    };
  }, [data]);

  const handleGetSalesSuggestions = async () => {
    if (!reportData) {
      toast({ title: "No data available", description: "Cannot generate suggestions without report data.", variant: "destructive" });
      return;
    }
    setIsGeneratingSuggestions(true);
    setSalesSuggestions([]);
    try {
      const productSummary = reportData.topProducts.length > 0 
        ? `Top products: ${reportData.topProducts.map(p => p.name).join(", ")}.`
        : "No specific product sales data available from recent reports.";

      const input: SalesEnhancementInput = { 
        businessContext: "A business using InvoiceFlow for managing invoices, customers, and products, seeking to improve sales performance.",
        totalRevenue: reportData.totalRevenue,
        invoiceCount: reportData.totalInvoices,
        customerCount: data?.customers.length || 0,
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
      toast({
        title: "Error",
        description: "Could not fetch sales suggestions. Please verify your API key in Settings > Modules > AI Settings.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const printGrid = (elementId: string) => {
    // This functionality is simplified as it can be complex to implement robustly here.
    // A more advanced solution would use a dedicated printing library.
    window.print();
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
      <div className="space-y-6">
        <PageHeader title="Business Reports & Analytics" description="Comprehensive insights into your business performance and finances."/>
         <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error: Missing or Insufficient Permissions</AlertTitle>
          <AlertDescription>
            <p>The application cannot access the data needed for reports. This is usually because the Firestore security rules have not been deployed to your project.</p>
            <p className="mt-2 font-semibold">Please deploy the rules using the Firebase CLI:</p>
            <code className="block my-2 p-2 bg-black/20 rounded text-xs">firebase deploy --only firestore:rules</code>
            <p>After deploying, please refresh this page.</p>
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetch()} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  if (!reportData) {
     return (
      <div className="space-y-6">
        <PageHeader title="Business Reports & Analytics" description="No data available to generate reports."/>
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <p>Create some invoices, customers, and products to see your reports here.</p>
          </CardContent>
        </Card>
      </div>
     );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Reports & Analytics"
        description="Comprehensive insights into your business performance and finances."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Download className="mr-2 h-4 w-4" />
              Print Page
            </Button>
            <Button onClick={handleGetSalesSuggestions} disabled={isGeneratingSuggestions}>
              {isGeneratingSuggestions ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI Insights
                </>
              )}
            </Button>
          </div>
        }
      />
      
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{reportData.totalRevenue.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">From all paid invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Amount</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{reportData.totalUnpaid.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">From pending or unpaid invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalInvoices}</div>
            <p className="text-xs text-muted-foreground">Across all statuses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Invoice</CardTitle>
            <BarChartHorizontalBig className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{reportData.averageInvoiceValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground">Average value of paid invoices</p>
          </CardContent>
        </Card>
      </div>

      {salesSuggestions.length > 0 && (
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-primary" />
              AI-Powered Sales Enhancement Suggestions
            </CardTitle>
            <CardDescription>
              Personalized recommendations based on your business data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {salesSuggestions.map((suggestion, index) => (
                <li key={index} className="flex">
                  <TrendingUp className="h-5 w-5 mr-2 text-primary shrink-0 mt-0.5" />
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card id="customer-revenue-grid">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-500" />
              Top Customers by Revenue
            </CardTitle>
            <CardDescription>
              Your highest-value customers based on total paid invoices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.topCustomers.length > 0 ? (
                  reportData.topCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="text-right">₹{customer.totalAmount.toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No customer revenue data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card id="product-revenue-grid">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2 text-green-500" />
              Top Products by Revenue
            </CardTitle>
            <CardDescription>
              Your best-selling products based on total paid invoices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.topProducts.length > 0 ? (
                  reportData.topProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-right">₹{product.totalAmount.toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No product revenue data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
