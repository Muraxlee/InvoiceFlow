
"use client";

import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BarChart3, FileText, Users } from "lucide-react";
import Link from "next/link";

const reportsList = [
  {
    title: "Invoice Report",
    description: "Analyze and filter all invoices by status, amount, and customer.",
    href: "/reports/invoices",
    icon: FileText,
  },
  {
    title: "Customer Report",
    description: "View detailed customer data including their invoice history and value.",
    href: "/reports/customers",
    icon: Users,
  },
  {
    title: "Sales Report",
    description: "Track sales trends, monthly revenue, and overall performance.",
    href: "/reports/sales",
    icon: BarChart3,
  },
];

export default function ReportsHubPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Reports & Analytics"
        description="Select a report to view detailed insights into your operations."
      />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportsList.map((report) => (
          <Link href={report.href} key={report.title} className="group">
            <Card className="h-full transition-all duration-200 group-hover:shadow-xl group-hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{report.title}</CardTitle>
                  <CardDescription className="mt-1">{report.description}</CardDescription>
                </div>
                <report.icon className="h-8 w-8 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                 <div className="text-sm font-medium text-primary flex items-center">
                    View Report <ArrowRight className="ml-2 h-4 w-4" />
                 </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
