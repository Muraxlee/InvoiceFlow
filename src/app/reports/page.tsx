"use client"; // Converted to Client Component

import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, BarChartBig, UsersRound, FileBox, LineChart } from "lucide-react";
import Image from "next/image";

export default function ReportsPage() {
  const reportTypes = [
    { 
      title: "Sales Reports", 
      description: "Analyze sales trends, revenue, and performance over time.", 
      icon: LineChart,
      imageHint: "sales graph"
    },
    { 
      title: "Product Reports", 
      description: "Track product performance, inventory, and sales by item.", 
      icon: FileBox,
      imageHint: "product chart"
    },
    { 
      title: "Customer Reports", 
      description: "Understand customer behavior, purchase history, and demographics.", 
      icon: UsersRound,
      imageHint: "customer data"
    },
    { 
      title: "Invoice Reports", 
      description: "Review invoice statuses, payment history, and aging reports.", 
      icon: BarChartBig,
      imageHint: "invoice list"
    },
  ];

  const handleGenerateReport = (reportTitle: string) => {
    // Placeholder function for generating reports
    // In a real app, this would trigger a download or navigate to a detailed report view
    alert(`Generating ${reportTitle}... (This is a placeholder)`);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Reports Center" 
        description="Generate and view various reports to gain insights into your business." 
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
              <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                <Image 
                  src={`https://placehold.co/600x338.png`} 
                  alt={`${report.title} placeholder`} 
                  width={600} 
                  height={338} 
                  className="object-cover rounded-md"
                  data-ai-hint={report.imageHint}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Placeholder for {report.title.toLowerCase()}. Detailed charts and data will appear here.
              </p>
            </CardContent>
            <CardContent className="border-t pt-4">
               <Button 
                 variant="outline" 
                 className="w-full sm:w-auto"
                 onClick={() => handleGenerateReport(report.title)} // Added onClick handler
               >
                <Download className="mr-2 h-4 w-4" /> Generate Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
