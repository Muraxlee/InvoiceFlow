import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, Users, CreditCard, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts';

const salesData = [
  { month: "Jan", sales: Math.floor(Math.random() * 5000) + 1000 },
  { month: "Feb", sales: Math.floor(Math.random() * 5000) + 1000 },
  { month: "Mar", sales: Math.floor(Math.random() * 5000) + 1000 },
  { month: "Apr", sales: Math.floor(Math.random() * 5000) + 1000 },
  { month: "May", sales: Math.floor(Math.random() * 5000) + 1000 },
  { month: "Jun", sales: Math.floor(Math.random() * 5000) + 1000 },
];

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--primary))",
  },
};


export default function DashboardPage() {
  // Placeholder data
  const totalRevenue = 78250.00;
  const newCustomers = 132;
  const invoicesSent = 450;
  const outstandingAmount = 12500.00;

  return (
    <div className="space-y-6">
      <PageHeader title="Sales Dashboard" description="Overview of your sales performance and key metrics." />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+10.2% from last month <TrendingUp className="inline h-3 w-3" /></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{newCustomers}</div>
            <p className="text-xs text-muted-foreground">+5.1% from last month <TrendingUp className="inline h-3 w-3" /></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices Sent</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoicesSent}</div>
            <p className="text-xs text-muted-foreground">+2 since yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Amount</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${outstandingAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">-2.5% from last week <TrendingDown className="inline h-3 w-3" /></p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Sales Overview</CardTitle>
            <CardDescription>Revenue generated per month for the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                  <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>A log of recent invoices and payments.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] overflow-y-auto">
            <ul className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted/50">
                  <div>
                    <p className="font-medium">Invoice #INV-2024-00{7 - i} sent to Client {String.fromCharCode(65 + i)}</p>
                    <p className="text-xs text-muted-foreground">Amount: ${(Math.random() * 1000 + 500).toFixed(2)}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{i+1} day{i > 0 ? 's' : ''} ago</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
