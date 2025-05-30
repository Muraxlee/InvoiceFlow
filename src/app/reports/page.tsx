"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Sparkles, Loader2, DollarSign, FileText, TrendingUp, AlertTriangle, Users, Package, BarChartHorizontalBig, Activity } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// Chart components no longer needed after removing graphs
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { SalesEnhancementInput } from "@/ai/placeholder";
import { getSalesEnhancementSuggestions } from "@/ai/placeholder";
import type { StoredInvoice, User, Customer as DbCustomer, Product as DbProduct } from "@/lib/database"; // Assuming types are exported from database
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import PageHeader from "@/components/page-header";
import Link from "next/link";

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

export default function ReportsPage() {
  const { toast } = useToast();
  const [salesSuggestions, setSalesSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  
  const [reportData, setReportData] = useState<ReportData>(initialReportData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const printGrid = (elementId: string) => {
    const printContent = document.getElementById(elementId);
    if (!printContent) {
      toast({
        title: "Print Error",
        description: "Could not find the content to print",
        variant: "destructive"
      });
      return;
    }
    
    const originalContents = document.body.innerHTML;
    const printCSS = `
      <style>
        @media print {
          body * { visibility: hidden; }
          #${elementId}, #${elementId} * { visibility: visible; }
          #${elementId} { position: absolute; left: 0; top: 0; width: 100%; }
          th, td { padding: 8px; border-bottom: 1px solid #ddd; }
          table { width: 100%; border-collapse: collapse; }
          .no-print { display: none !important; }
          h2 { margin-bottom: 10px; font-size: 18px; }
          button { display: none !important; }
        }
      </style>
    `;
    
    // Create a temporary title for the printed page
    const title = printContent.querySelector('h3')?.textContent || 
                  printContent.querySelector('h2')?.textContent || 
                  "InvoiceFlow Report";
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Print Error",
        description: "Could not open print window. Please check your popup settings.",
        variant: "destructive"
      });
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          ${printCSS}
        </head>
        <body>
          <div id="${elementId}">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
  };

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
        
        // Check if we have any sales data at all
        const hasSalesData = Object.values(monthlySales).some(value => value > 0);
        
        // If no real sales data exists, generate sample data for demonstration
        if (!hasSalesData && process.env.NODE_ENV === 'development') {
          // Sample data in development mode
          for (let i = 11; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            const monthName = format(date, "MMM yyyy");
            // Generate some random data that follows a realistic pattern
            const randomValue = Math.floor(1000 + Math.random() * 9000 * (1 + i % 3 * 0.2));
            monthlySalesData.push({
              month: monthName,
              sales: randomValue,
            });
          }
        } else {
          // Use actual sales data
          for (let i = 11; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            const monthKey = format(date, "yyyy-MM");
            const monthName = format(date, "MMM yyyy");
            monthlySalesData.push({
              month: monthName,
              sales: monthlySales[monthKey] || 0,
            });
          }
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

      // Get API key from localStorage instead
      const GOOGLE_AI_API_KEY_STORAGE_KEY = "invoiceflow_google_ai_api_key";
      const apiKey = localStorage.getItem(GOOGLE_AI_API_KEY_STORAGE_KEY);
      
      if (!apiKey) {
        setSuggestionError("AI API key not configured. Please add your API key in Settings > Modules > AI Settings.");
        toast({
          title: "Missing API Key",
          description: "Please configure your API key in Settings > Modules > AI Settings.",
          variant: "destructive",
        });
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
        apiKey: apiKey
      };
      const result = await getSalesEnhancementSuggestions(input);
      setSalesSuggestions(result.suggestions);
      toast({
        title: "AI Suggestions Received",
        description: "Sales enhancement suggestions have been generated based on your data.",
      });
    } catch (error) {
      console.error("Error generating sales suggestions:", error);
      setSuggestionError("Failed to generate sales suggestions. Please check your API key in Settings > Modules > AI Settings.");
      toast({
        title: "Error",
        description: "Could not fetch sales suggestions. Please verify your API key in Settings > Modules > AI Settings.",
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
        title="Business Reports & Analytics"
        description="Comprehensive insights into your business performance and finances."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Download className="mr-2 h-4 w-4" />
              Print All Reports
            </Button>
            <Button onClick={handleGetSalesSuggestions} disabled={isGeneratingSuggestions || !window.electronAPI}>
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

      {error && (
        <Card className="bg-destructive/10 border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-destructive mr-2" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Activity className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Analyzing your business data...</p>
        </div>
      ) : (
        <>
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

          {/* Monthly Revenue Data Table */}
          <Card id="monthly-revenue-grid">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Monthly Revenue Data</CardTitle>
                <CardDescription>Revenue distribution over the last 12 months (highest month highlighted)</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => printGrid('monthly-revenue-grid')}>
                <Download className="mr-2 h-4 w-4" /> Print
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Revenue (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.monthlySalesData.length > 0 ? (
                    (() => {
                      // Find the highest revenue month
                      const highestRevenue = Math.max(...reportData.monthlySalesData.map(d => d.sales));
                      
                      return reportData.monthlySalesData.map((data, index) => {
                        const isHighest = data.sales === highestRevenue && highestRevenue > 0;
                        return (
                          <TableRow 
                            key={index} 
                            className={isHighest ? "bg-primary/20 dark:bg-primary/30" : ""}
                          >
                            <TableCell className={`font-medium ${isHighest ? "font-bold" : ""}`}>
                              {data.month}
                              {isHighest && <span className="ml-2 text-primary font-bold">★</span>}
                            </TableCell>
                            <TableCell className={`text-right ${isHighest ? "font-bold text-primary text-lg" : ""}`}>
                              ₹{data.sales.toLocaleString('en-IN')}
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No monthly revenue data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* AI-Generated Insights */}
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

          {/* Unpaid Invoices Section */}
          <Card id="unpaid-invoices-grid">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                  Unpaid Invoices
                </CardTitle>
                <CardDescription>
                  Invoices with outstanding payments requiring attention
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => printGrid('unpaid-invoices-grid')}>
                <Download className="mr-2 h-4 w-4" /> Print
              </Button>
            </CardHeader>
            <CardContent>
              <UnpaidInvoicesTable />
            </CardContent>
          </Card>

          {/* Customer-wise Revenue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card id="customer-revenue-grid">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2 text-blue-500" />
                    Top Customers by Revenue
                  </CardTitle>
                  <CardDescription>
                    Your highest-value customers based on total purchases
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => printGrid('customer-revenue-grid')}>
                  <Download className="mr-2 h-4 w-4" /> Print
                </Button>
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
                      (() => {
                        // Find the highest revenue customer
                        const highestRevenue = Math.max(...reportData.topCustomers.map(c => c.totalAmount));
                        
                        return reportData.topCustomers.map((customer, index) => {
                          const isHighest = customer.totalAmount === highestRevenue && highestRevenue > 0;
                          return (
                            <TableRow 
                              key={customer.id}
                              className={isHighest ? "bg-blue-100 dark:bg-blue-900/30" : ""}
                            >
                              <TableCell className={`font-medium ${isHighest ? "font-bold" : ""}`}>
                                {customer.name}
                                {isHighest && <span className="ml-2 text-blue-700 dark:text-blue-300 font-bold">★</span>}
                              </TableCell>
                              <TableCell className={`text-right ${isHighest ? "font-bold text-blue-700 dark:text-blue-300 text-lg" : ""}`}>
                                ₹{customer.totalAmount.toLocaleString('en-IN')}
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()
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

            {/* Product-wise Revenue */}
            <Card id="product-revenue-grid">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Package className="h-5 w-5 mr-2 text-green-500" />
                    Top Products by Revenue
                  </CardTitle>
                  <CardDescription>
                    Your best-selling products based on total revenue
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => printGrid('product-revenue-grid')}>
                  <Download className="mr-2 h-4 w-4" /> Print
                </Button>
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
                      (() => {
                        // Find the highest revenue product
                        const highestRevenue = Math.max(...reportData.topProducts.map(p => p.totalAmount));
                        
                        return reportData.topProducts.map((product, index) => {
                          const isHighest = product.totalAmount === highestRevenue && highestRevenue > 0;
                          return (
                            <TableRow 
                              key={product.id}
                              className={isHighest ? "bg-green-100 dark:bg-green-900/30" : ""}
                            >
                              <TableCell className={`font-medium ${isHighest ? "font-bold" : ""}`}>
                                {product.name}
                                {isHighest && <span className="ml-2 text-green-700 dark:text-green-300 font-bold">★</span>}
                              </TableCell>
                              <TableCell className={`text-right ${isHighest ? "font-bold text-green-700 dark:text-green-300 text-lg" : ""}`}>
                                ₹{product.totalAmount.toLocaleString('en-IN')}
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()
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

          {/* Business Health Indicators */}
          <Card id="payment-status-grid">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payment Status Overview</CardTitle>
                <CardDescription>Distribution of invoices by payment status</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => printGrid('payment-status-grid')}>
                <Download className="mr-2 h-4 w-4" /> Print
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Status</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(reportData.paymentStatusCounts).length > 0 ? (
                    Object.entries(reportData.paymentStatusCounts).map(([status, count]) => (
                      <TableRow key={status}>
                        <TableCell className="font-medium">{status}</TableCell>
                        <TableCell className="text-right">{count}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No payment status data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// Component for Unpaid Invoices Table
function UnpaidInvoicesTable() {
  const [unpaidInvoices, setUnpaidInvoices] = useState<StoredInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUnpaidInvoices() {
      if (!window.electronAPI) return;
      
      try {
        const allInvoices = await window.electronAPI.getAllInvoices();
        const filtered = allInvoices
          .filter(inv => ["Unpaid", "Pending", "Overdue"].includes(inv.status))
          .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
        
        setUnpaidInvoices(filtered.slice(0, 10)); // Show top 10 unpaid invoices
      } catch (error) {
        console.error("Error fetching unpaid invoices:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchUnpaidInvoices();
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  
  if (unpaidInvoices.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        No unpaid invoices found. All payments are up to date!
      </div>
    );
  }
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice #</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {unpaidInvoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="font-medium">
              <Link href={`/invoices/${invoice.id}`} className="text-primary hover:underline">
                {invoice.invoiceNumber}
              </Link>
            </TableCell>
            <TableCell>{invoice.customerName}</TableCell>
            <TableCell>{format(new Date(invoice.invoiceDate), "dd MMM yyyy")}</TableCell>
            <TableCell>
              <span className={`px-2 py-1 rounded-full text-xs ${
                invoice.status === "Overdue" ? "bg-red-100 text-red-800" :
                invoice.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                "bg-blue-100 text-blue-800"
              }`}>
                {invoice.status}
              </span>
            </TableCell>
            <TableCell className="text-right">₹{invoice.amount.toLocaleString('en-IN')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

    