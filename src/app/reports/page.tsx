
"use client";

import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, BarChartBig, UsersRound, FileBox, LineChart as LineChartIcon, Sparkles, Loader2 } from "lucide-react"; // Renamed LineChart to LineChartIcon to avoid conflict
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { SalesEnhancementInput } from "@/ai/flows/sales-enhancement-flow"; // Will create this
import { getSalesEnhancementSuggestions } from "@/ai/flows/sales-enhancement-flow";

const commonChartConfig = {
  data: { label: "Data", color: "hsl(var(--primary))" },
  dataAlt: { label: "Alt Data", color: "hsl(var(--secondary))" }
};

const salesReportData = [
  { month: "Jan", revenue: 2400, newCustomers: 20 },
  { month: "Feb", revenue: 1398, newCustomers: 15 },
  { month: "Mar", revenue: 9800, newCustomers: 50 },
  { month: "Apr", revenue: 3908, newCustomers: 30 },
  { month: "May", revenue: 4800, newCustomers: 35 },
  { month: "Jun", revenue: 3800, newCustomers: 25 },
];

const productReportData = [
  { product: "Widget A", sales: 4000, units: 240 },
  { product: "Widget B", sales: 3000, units: 139 },
  { product: "Gadget X", sales: 2000, units: 980 },
  { product: "Gizmo Y", sales: 2780, units: 308 },
  { product: "Thing Z", sales: 1890, units: 400 },
];

const customerReportData = [
  { segment: "New", count: 120, ltv: 50 },
  { segment: "Returning", count: 350, ltv: 250 },
  { segment: "VIP", count: 80, ltv: 800 },
  { segment: "Churned", count: 40, ltv: 10 },
];

const invoiceReportData = [
  { status: "Paid", count: 250, value: 15000 },
  { status: "Pending", count: 80, value: 6000 },
  { status: "Overdue", count: 30, value: 3500 },
  { status: "Draft", count: 15, value: 1200 },
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
      data: salesReportData,
      dataKey: "revenue",
      categoryKey: "month",
      chartType: "line" as const,
    },
    { 
      title: "Product Reports", 
      description: "Track product performance, sales volume, and units sold to optimize inventory and marketing focus.", 
      icon: FileBox,
      data: productReportData,
      dataKey: "sales",
      categoryKey: "product",
      chartType: "bar" as const,
    },
    { 
      title: "Customer Reports", 
      description: "Understand customer segments, count, and lifetime value (LTV) to tailor retention and engagement strategies.", 
      icon: UsersRound,
      data: customerReportData,
      dataKey: "count",
      categoryKey: "segment",
      chartType: "bar" as const,
    },
    { 
      title: "Invoice Reports", 
      description: "Review invoice statuses, counts, and total values to manage cash flow and outstanding payments effectively.", 
      icon: BarChartBig,
      data: invoiceReportData,
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
      // For now, we pass a generic or empty input
      const input: SalesEnhancementInput = { businessContext: "A small to medium-sized business looking to improve sales." };
      const result = await getSalesEnhancementSuggestions(input);
      setSalesSuggestions(result.suggestions);
      toast({
        title: "AI Suggestions Received",
        description: "Sales enhancement suggestions have been generated.",
      });
    } catch (error) {
      console.error("Error generating sales suggestions:", error);
      setSuggestionError("Failed to generate sales suggestions. Please try again.");
      toast({
        title: "Error",
        description: "Could not fetch sales suggestions.",
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
                        <YAxis tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                        <Line type="monotone" dataKey={report.dataKey} stroke="var(--color-data)" strokeWidth={2} dot={false} />
                      </LineChart>
                    ) : (
                      <BarChart data={report.data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey={report.categoryKey} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={50} interval={0}/>
                        <YAxis tickLine={false} axisLine={false} />
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
              <CardDescription>Get actionable suggestions from AI to help boost your sales performance and identify new opportunities.</CardDescription>
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
              <h4 className="font-semibold">Here are some suggestions:</h4>
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
                Generating insights... Please wait.
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
