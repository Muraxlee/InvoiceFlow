
"use client";

import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BarChart3, FileText, Users, Package, Boxes, DraftingCompass, UsersRound } from "lucide-react";
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
    icon: UsersRound,
  },
  {
    title: "Sales Report",
    description: "Track sales trends, monthly revenue, and overall performance.",
    href: "/reports/sales",
    icon: BarChart3,
  },
  {
    title: "Product Sales Report",
    description: "Analyze product performance based on units sold and total revenue.",
    href: "/reports/products",
    icon: Package,
  },
  {
    title: "Inventory Stock Report",
    description: "View and filter current stock levels for all inventory items.",
    href: "/reports/inventory",
    icon: Boxes,
  },
  {
    title: "Employee Report",
    description: "Track task assignments and status for each employee.",
    href: "/reports/employees",
    icon: Users,
  },
  {
    title: "Measurement Report",
    description: "Search and review all saved measurement records.",
    href: "/reports/measurements",
    icon: DraftingCompass,
  },
];

export default function ReportsHubPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Reports & Analytics"
        description="Select a report to view detailed insights into your operations."
      />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {reportsList.map((report) => (
          <Link href={report.href} key={report.title} className="group">
            <Card className="h-full transition-all duration-200 group-hover:shadow-xl group-hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{report.title}</CardTitle>
                </div>
                <report.icon className="h-8 w-8 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                 <p className="text-sm text-muted-foreground mb-4">{report.description}</p>
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
