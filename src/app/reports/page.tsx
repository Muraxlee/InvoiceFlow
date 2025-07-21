
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, DollarSign, FileText, AlertTriangle, Users, Package, BarChartHorizontalBig, RefreshCw, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMemo } from "react";
import type { StoredInvoice, Customer, Product } from "@/types/database";
import { format, isPast, startOfDay, subMonths } from 'date-fns';
import PageHeader from "@/components/page-header";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getInvoices, getCustomers, getProducts } from '@/lib/firestore-actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface ReportData {
  totalRevenue: number;
  totalUnpaid: number;
  totalInvoices: number;
  averageInvoiceValue: number;
  paymentStatusCounts: { name: string; value: number }[];
  monthlySalesData: { month: string; sales: number }[];
  topCustomers: { name: string; totalAmount: number; id: string }[];
  topProducts: { name:string; totalAmount: number; id: string }[];
}

export default function ReportsPage() {
  const queryClient = useQueryClient();

  const { data: invoices, isLoading: isLoadingInvoices, error: invoicesError } = useQuery<StoredInvoice[]>({
    queryKey: ['invoices'],
    queryFn: getInvoices,
  });
  
  const { data: customers, isLoading: isLoadingCustomers, error: customersError } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });
  
  const { data: products, isLoading: isLoadingProducts, error: productsError } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const isLoading = isLoadingInvoices || isLoadingCustomers || isLoadingProducts;
  const error = invoicesError || customersError || productsError;

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const reportData = useMemo<ReportData | null>(() => {
    if (!invoices || !customers || !products) return null;
    
    let totalRevenue = 0;
    let totalUnpaid = 0;
    const paymentStatusCounts: { [key: string]: number } = {};
    const monthlySales: { [key: string]: number } = {};
    const today = startOfDay(new Date());

    invoices.forEach(inv => {
      const invoiceDate = new Date(inv.invoiceDate);
      let status = inv.status || "Unpaid";

      // Dynamically determine overdue status
      const isOverdue = inv.dueDate && isPast(new Date(inv.dueDate)) && (status === 'Unpaid' || status === 'Partially Paid' || status === 'Pending');
      if (isOverdue) {
        status = 'Overdue';
      }

      paymentStatusCounts[status] = (paymentStatusCounts[status] || 0) + 1;

      if (inv.status === "Paid") {
        totalRevenue += inv.amount || 0;
        const monthKey = format(invoiceDate, "yyyy-MM");
        monthlySales[monthKey] = (monthlySales[monthKey] || 0) + (inv.amount || 0);
      } else if (["Pending", "Unpaid", "Overdue", "Draft", "Partially Paid"].includes(status)) {
        totalUnpaid += inv.amount || 0;
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
        customerSales[inv.customerId] = (customerSales[inv.customerId] || 0) + (inv.amount || 0);
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
      paymentStatusCounts: Object.entries(paymentStatusCounts).map(([name, value]) => ({ name, value })),
      monthlySalesData,
      topCustomers,
      topProducts,
    };
  }, [invoices, customers, products]);

  const statusVariant = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "paid": return "success";
      case "pending": return "warning";
      case "unpaid": return "warning";
      case "overdue": return "destructive";
      case "draft": return "outline";
      case "partially paid": return "info";
      default: return "outline";
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-500" />
              Invoice Status Report
            </CardTitle>
            <CardDescription>
              A summary of all invoices by their current payment status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.paymentStatusCounts.length > 0 ? (
                  reportData.paymentStatusCounts.map((status) => (
                    <TableRow key={status.name}>
                      <TableCell className="font-medium">
                        <Badge variant={statusVariant(status.name)}>{status.name}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{status.value}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No status data available
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

        <Card id="customer-revenue-grid" className="md:col-span-2">
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
      </div>
    </div>
  );
}
