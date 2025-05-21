
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Sparkles, Loader2, Plus, ChevronDown, Share2, ListTree, Search as SearchIcon, Settings2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import ArcProgress from "@/components/ui/arc-progress"; // New component
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

interface KpiItem {
  title: string;
  value: string;
  progress: number;
  color: string; // HSL string for color
}

const kpiData: KpiItem[] = [
  { title: "Revenue", value: "₹1,798k", progress: 75, color: "hsl(var(--primary))" },
  { title: "Cost", value: "₹1,345k", progress: 60, color: "hsl(var(--destructive))" },
  { title: "Profit", value: "₹800k", progress: 40, color: "hsl(140 60% 50%)" }, // Custom green
  { title: "Recovery", value: "15%", progress: 15, color: "hsl(var(--primary))" },
  { title: "Search Audited", value: "30%", progress: 30, color: "hsl(var(--primary))" },
];

const tableData = [
  { day: "11 Feb 2024", activeUser: "145,879", activeSearches: "230,908", searchAttempts: "14,346", searchCompleted: "1,111,765", adClicks: "67,223", ctr: "790,908" },
  { day: "12 Feb 2024", activeUser: "567,125", activeSearches: "2,347,875", searchAttempts: "12,444", searchCompleted: "4,456,876", adClicks: "1,487,765", ctr: "790,908" },
  { day: "13 Feb 2024", activeUser: "897,987", activeSearches: "1,111,765", searchAttempts: "65,097", searchCompleted: "2,161,450", adClicks: "12,398", ctr: "790,908" },
  { day: "14 Feb 2024", activeUser: "167,008", activeSearches: "790,654", searchAttempts: "10,001", searchCompleted: "7,241,300", adClicks: "17,098", ctr: "790,908" },
  { day: "15 Feb 2024", activeUser: "134,864", activeSearches: "6,854,321", searchAttempts: "67,212", searchCompleted: "1,451,709", adClicks: "12,109", ctr: "790,908" },
  { day: "16 Feb 2024", activeUser: "745,800", activeSearches: "752,908", searchAttempts: "34,894", searchCompleted: "3,147,791", adClicks: "10,008", ctr: "790,908" },
];


export default function ReportsPage() {
  const { toast } = useToast();
  const [salesSuggestions, setSalesSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [activeMetrics, setActiveMetrics] = useState<string[]>(["Revenue"]);

  const availableMetrics = ["Revenue", "Interest Expense", "Searches", "Ad Clicks", "CTR", "Search Attempts", "Search Completed"];

  const toggleMetric = (metric: string) => {
    setActiveMetrics(prev => 
      prev.includes(metric) ? prev.filter(m => m !== metric) : [...prev, metric]
    );
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
      {/* Top Controls Card */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="font-semibold shrink-0">Saved Reports:</span>
            <Button variant="link" className="p-0 h-auto text-sm">Last 7 days performance</Button>
            <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-primary">Earnings before income taxes</Button>
            <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-primary">Shares used in computing earnings</Button>
            <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-primary">Total operating expenses</Button>
            <Button variant="link" className="p-0 h-auto text-sm flex items-center">More <ChevronDown className="ml-1 h-3 w-3" /></Button>
          </div>
          <div className="flex items-center gap-1 text-sm flex-wrap">
            <span className="font-semibold shrink-0">Metrics:</span>
            {availableMetrics.map(metric => (
              <Button 
                key={metric} 
                variant={activeMetrics.includes(metric) ? "default" : "outline"} 
                size="sm"
                onClick={() => toggleMetric(metric)}
                className="text-xs h-7 px-2"
              >
                {metric}
              </Button>
            ))}
            <Button size="icon" variant="ghost" className="w-7 h-7"><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold shrink-0">Group by:</span>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs">Hour <ChevronDown className="ml-1 h-3 w-3"/></Button>
              <Button size="icon" variant="ghost" className="w-7 h-7"><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex gap-2">
              <Button variant="default" size="sm">Get Report</Button>
              <Button variant="outline" size="sm">Cancel</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Card */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-around gap-x-6 gap-y-4">
          {kpiData.map(kpi => (
            <div key={kpi.title} className="flex items-center gap-3">
              <ArcProgress percentage={kpi.progress} color={kpi.color} size={40} strokeWidth={4} />
              <div>
                <div className="text-xs text-muted-foreground">{kpi.title}</div>
                <div className="text-lg font-semibold">{kpi.value}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card>
        <Tabs defaultValue="table" className="w-full">
          <CardHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <TabsList className="w-auto">
                <TabsTrigger value="table">Table</TabsTrigger>
                <TabsTrigger value="chart" disabled>Chart</TabsTrigger> 
              </TabsList>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon"><Share2 className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon"><ListTree className="h-4 w-4" /></Button>
                <div className="relative ml-2">
                  <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search..." className="pl-8 h-9 w-40 lg:w-56" />
                </div>
              </div>
            </div>
          </CardHeader>
          <TabsContent value="table" className="mt-0"> {/* mt-0 because CardHeader has padding */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Active User</TableHead>
                  <TableHead>Active Searches</TableHead>
                  <TableHead>Search Attempts</TableHead>
                  <TableHead>Search Completed</TableHead>
                  <TableHead>Ad Clicks</TableHead>
                  <TableHead>CTR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.day}</TableCell>
                    <TableCell>{row.activeUser}</TableCell>
                    <TableCell>{row.activeSearches}</TableCell>
                    <TableCell>{row.searchAttempts}</TableCell>
                    <TableCell>{row.searchCompleted}</TableCell>
                    <TableCell>{row.adClicks}</TableCell>
                    <TableCell>{row.ctr}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          {/* 
          <TabsContent value="chart" className="mt-0">
             Placeholder for chart view 
            <div className="p-4 text-center text-muted-foreground">Chart view not yet implemented.</div>
          </TabsContent>
          */}
        </Tabs>
      </Card>

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
