
"use client";

import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, BarChartBig, UsersRound, FileBox, LineChart as LineChartIcon, Sparkles, Loader2 } from "lucide-react"; // Renamed LineChart to LineChartIcon to avoid conflict
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { SalesEnhancementInput } from "@/ai/flows/sales-enhancement-flow"; 
import { getSalesEnhancementSuggestions } from "@/ai/flows/sales-enhancement-flow";
import { loadFromLocalStorage } from "@/lib/localStorage";
import type { InvoiceFormValues } from "@/components/invoice-form";
import type { Customer } from "@/app/customers/page";
import type { Product } from "@/app/products/page";

const INVOICES_STORAGE_KEY = "app_invoices";
const CUSTOMERS_STORAGE_KEY = "app_customers";
const PRODUCTS_STORAGE_KEY = "app_products";

interface StoredInvoice extends InvoiceFormValues {
  id: string;
  status: "Paid" | "Pending" | "Overdue" | "Draft";
  amount: number;
}

const commonChartConfig = {
  data: { label: "Data", color: "hsl(var(--primary))" },
  dataAlt: { label: "Alt Data", color: "hsl(var(--secondary))" }
};

// Dummy data for charts, will be replaced by localStorage data or further refined
const salesReportDataStatic = [
  { month: "Jan", revenue: 24000, newCustomers: 20 },
  { month: "Feb", revenue: 13980, newCustomers: 15 },
  { month: "Mar", revenue: 98000, newCustomers: 50 },
  { month: "Apr", revenue: 39080, newCustomers: 30 },
  { month: "May", revenue: 48000, newCustomers: 35 },
  { month: "Jun", revenue: 38000, newCustomers: 25 },
];

const productReportDataStatic = [
  { product: "Widget A", sales: 40000, units: 240 },
  { product: "Widget B", sales: 30000, units: 139 },
  { product: "Gadget X", sales: 20000, units: 980 },
  { product: "Gizmo Y", sales: 27800, units: 308 },
  { product: "Thing Z", sales: 18900, units: 400 },
];

const customerReportDataStatic = [
  { segment: "New", count: 120, ltv: 5000 },
  { segment: "Returning", count: 350, ltv: 25000 },
  { segment: "VIP", count: 80, ltv: 80000 },
  { segment: "Churned", count: 40, ltv: 1000 },
];

const invoiceReportDataStatic = [
  { status: "Paid", count: 250, value: 150000 },
  { status: "Pending", count: 80, value: 60000 },
  { status: "Overdue", count: 30, value: 35000 },
  { status: "Draft", count: 15, value: 12000 },
];


export default function ReportsPage() {
  const { toast } = useToast();
  const [salesSuggestions, setSalesSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);


  const reportTypes = [
    { 
      title: "Sales Reports", 
      description: "Analyze sales trends, revenue, and customer acquisition over time to identify growth patterns and opportunities.", 
      icon: LineChartIcon,
      data: salesReportDataStatic, // Will ideally be dynamic
      dataKey: "revenue",
      categoryKey: "month",
      chartType: "line" as const,
    },
    { 
      title: "Product Reports", 
      description: "Track product performance, sales volume, and units sold to optimize inventory and marketing focus.", 
      icon: FileBox,
      data: productReportDataStatic, // Will ideally be dynamic
      dataKey: "sales",
      categoryKey: "product",
      chartType: "bar" as const,
    },
    { 
      title: "Customer Reports", 
      description: "Understand customer segments, count, and lifetime value (LTV) to tailor retention and engagement strategies.", 
      icon: UsersRound,
      data: customerReportDataStatic, // Will ideally be dynamic
      dataKey: "count",
      categoryKey: "segment",
      chartType: "bar" as const,
    },
    { 
      title: "Invoice Reports", 
      description: "Review invoice statuses, counts, and total values to manage cash flow and outstanding payments effectively.", 
      icon: BarChartBig,
      data: invoiceReportDataStatic, // Will ideally be dynamic
      dataKey: "count",
      categoryKey: "status",
      chartType: "bar" as const,
    },
  ];

  const handleGenerateReport = (reportTitle: string) => {
    alert(`Generating ${reportTitle}... (This is a placeholder for download functionality)`);
  };

  const handleGetSalesSuggestions = async () => {
    setIsGeneratingSuggestions(true);
    setSuggestionError(null);
    setSalesSuggestions([]);
    try {
      const storedInvoices = loadFromLocalStorage<StoredInvoice[]>(INVOICES_STORAGE_KEY, []);
      const storedCustomers = loadFromLocalStorage<Customer[]>(CUSTOMERS_STORAGE_KEY, []);
      const storedProducts = loadFromLocalStorage<Product[]>(PRODUCTS_STORAGE_KEY, []);

      let totalRevenue = 0;
      storedInvoices.forEach(invoice => {
        if (invoice.status === 'Paid') {
          totalRevenue += invoice.amount;
        }
      });

      const invoiceCount = storedInvoices.length;
      const customerCount = storedCustomers.length;
      
      let productSummary = "Available products: ";
      if (storedProducts.length > 0) {
        productSummary += storedProducts.slice(0, 5).map(p => p.name).join(", ");
        if (storedProducts.length > 5) {
          productSummary += `, and ${storedProducts.length - 5} more.`;
        }
      } else {
        productSummary = "No specific product data available.";
      }
      if (storedInvoices.length > 0 && storedProducts.length > 0) {
        // Basic sales trend - could be more sophisticated
        const lastInvoiceDate = new Date(Math.max(...storedInvoices.map(inv => new Date(inv.invoiceDate).getTime())));
        productSummary += ` Last invoice activity around ${lastInvoiceDate.toLocaleDateString()}.`;
      }


      const input: SalesEnhancementInput = { 
        businessContext: "A business using InvoiceFlow for managing invoices, customers, and products.",
        totalRevenue: totalRevenue,
        invoiceCount: invoiceCount,
        customerCount: customerCount,
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

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Reports Center" 
        description="Generate and view various reports to gain insights into your business. Leverage AI for sales strategies." 
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {reportTypes.map((report) => (
          <Card key={report.title} className="flex flex-col">
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
              <div className="shrink-0">
                <report.icon className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle>{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="aspect-video bg-muted/50 p-4 rounded-md">
                <ChartContainer config={commonChartConfig} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {report.chartType === 'line' ? (
                      <LineChart data={report.data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey={report.categoryKey} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={50} interval={0} />
                        <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `₹${typeof value === 'number' ? (value/1000).toFixed(0) : value}k`} />
                        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                        <Line type="monotone" dataKey={report.dataKey} stroke="var(--color-data)" strokeWidth={2} dot={false} />
                      </LineChart>
                    ) : (
                      <BarChart data={report.data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey={report.categoryKey} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={50} interval={0}/>
                        <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `₹${typeof value === 'number' ? (value/1000).toFixed(0) : value}k`} />
                        <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
                        <Bar dataKey={report.dataKey} fill="var(--color-data)" radius={4} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
               <Button 
                 variant="outline" 
                 className="w-full sm:w-auto"
                 onClick={() => handleGenerateReport(report.title)}
               >
                <Download className="mr-2 h-4 w-4" /> Download Report
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

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
