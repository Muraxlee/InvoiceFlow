"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, Sector
} from 'recharts';
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { format, subDays, parseISO, isValid, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import {
  DollarSign, Users, ListChecks, FileWarning, Activity, ShoppingBag,
  TrendingUp, Clock, Calendar, BarChart3, RefreshCw, AlertCircle,
  ArrowRight, ArrowUp, ArrowDown, PieChart as PieChartIcon, 
  CircleDollarSign, Receipt, Package, ChevronRight, LineChart as LineChartIcon
} from "lucide-react";

interface StoredInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerId: string;
  amount: number;
  status: "Paid" | "Pending" | "Overdue" | "Draft";
  invoiceDate: string | Date;
  dueDate?: string | Date;
  items?: Array<{
    productId: string;
    description: string;
    quantity: number;
    price: number;
  }>;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
}

// Dashboard chart configurations
const chartConfigSales = {
  revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
  invoices: { label: "Invoices", color: "hsl(var(--chart-2))" }
};

const chartConfigStatus = {
  paid: { label: "Paid", color: "hsl(var(--success))" },
  pending: { label: "Pending", color: "hsl(var(--warning))" },
  overdue: { label: "Overdue", color: "hsl(var(--destructive))" },
  draft: { label: "Draft", color: "hsl(var(--muted))" }
};

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2'];

export default function DashboardPage() {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [outstandingAmount, setOutstandingAmount] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [pendingInvoicesCount, setPendingInvoicesCount] = useState(0);
  const [recentInvoices, setRecentInvoices] = useState<StoredInvoice[]>([]);
  const [topCustomers, setTopCustomers] = useState<{name: string; totalAmount: number; id: string}[]>([]);
  const [topProducts, setTopProducts] = useState<{name: string; totalAmount: number; id: string}[]>([]);
  const [salesData, setSalesData] = useState<{ date: string; revenue: number; invoices: number }[]>([]);
  const [invoiceStatusData, setInvoiceStatusData] = useState<{ name: string; value: number }[]>([]);
  const [dailyTrend, setDailyTrend] = useState<{ date: string; amount: number }[]>([]);
  const [revenueGrowth, setRevenueGrowth] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStatusIndex, setActiveStatusIndex] = useState(0);

  // Fetch all data using Electron API
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if Electron API is available
      if (!window.electronAPI) {
        throw new Error("Electron API is not available. Please run in desktop mode.");
      }

      // Fetch all required data in parallel
      const [invoices, customers, products, companyInfo] = await Promise.all([
        window.electronAPI.getAllInvoices(),
        window.electronAPI.getAllCustomers(),
        window.electronAPI.getAllProducts(),
        window.electronAPI.getCompanyInfo(),
      ]);

      // Process the data for dashboard metrics
      processInvoiceData(invoices, customers, products);
      
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Process invoice data for dashboard metrics
  const processInvoiceData = (invoices: StoredInvoice[], customers: Customer[], products: Product[]) => {
    // Calculate key metrics
    let revenue = 0;
    let outstanding = 0;
    let pendingCount = 0;
    const statusCounts: Record<string, number> = { Paid: 0, Pending: 0, Overdue: 0, Draft: 0 };
    const dailySales: Record<string, number> = {};
    const dailyInvoiceCounts: Record<string, number> = {};
    const customerSales: Record<string, number> = {};
    const productSales: Record<string, number> = {};
    
    // Get dates for the last 30 days
    const today = new Date();
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(today, 29 - i);
      return format(date, 'yyyy-MM-dd');
    });

    // Initialize daily sales data
    last30Days.forEach(date => {
      dailySales[date] = 0;
      dailyInvoiceCounts[date] = 0;
    });
    
    // Process invoice data
    invoices.forEach(invoice => {
      const invDate = new Date(invoice.invoiceDate);
      if (!isValid(invDate)) return;
      
      // Update status counts
      const status = invoice.status || "Unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      // Calculate revenue and outstanding amounts
      if (status === "Paid") {
        revenue += invoice.amount;
        
        // Update daily sales for the last 30 days
        const dateStr = format(invDate, 'yyyy-MM-dd');
        if (dailySales[dateStr] !== undefined) {
          dailySales[dateStr] += invoice.amount;
          dailyInvoiceCounts[dateStr] += 1;
        }
        
        // Track sales by customer
        customerSales[invoice.customerId] = (customerSales[invoice.customerId] || 0) + invoice.amount;
        
        // Track sales by product
        if (invoice.items && Array.isArray(invoice.items)) {
          invoice.items.forEach(item => {
            const itemTotal = (item.quantity || 0) * (item.price || 0);
            productSales[item.productId] = (productSales[item.productId] || 0) + itemTotal;
          });
        }
      } else if (["Pending", "Overdue"].includes(status)) {
        outstanding += invoice.amount;
        if (status === "Pending") {
          pendingCount++;
        }
      }
    });
    
    // Prepare chart data for daily sales
    const chartData = last30Days.map(date => ({
      date: format(parseISO(date), 'MMM dd'),
      revenue: dailySales[date] || 0,
      invoices: dailyInvoiceCounts[date] || 0
    }));
    
    // Prepare pie chart data for invoice status
    const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
    
    // Calculate revenue growth (comparing last 15 days to previous 15 days)
    const recentRevenue = last30Days.slice(15).reduce((sum, date) => sum + (dailySales[date] || 0), 0);
    const previousRevenue = last30Days.slice(0, 15).reduce((sum, date) => sum + (dailySales[date] || 0), 0);
    const growthRate = previousRevenue > 0 
      ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 
      : recentRevenue > 0 ? 100 : 0;
    
    // Prepare top customers data
    const topCustomersData = Object.entries(customerSales)
      .map(([id, totalAmount]) => {
        const customer = customers.find(c => c.id === id);
        return { id, name: customer?.name || "Unknown Customer", totalAmount };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);
    
    // Prepare top products data
    const topProductsData = Object.entries(productSales)
      .map(([id, totalAmount]) => {
        const product = products.find(p => p.id === id);
        return { id, name: product?.name || "Unknown Product", totalAmount };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);
    
    // Prepare daily trend data for the area chart
    const trendData = last30Days.map(date => ({
      date: format(parseISO(date), 'MMM dd'),
      amount: dailySales[date] || 0
    }));
    
    // Sort recent invoices by date
    const sortedInvoices = [...invoices]
      .map(inv => ({
        ...inv, 
        invoiceDate: new Date(inv.invoiceDate)
      }))
      .sort((a, b) => (b.invoiceDate as Date).getTime() - (a.invoiceDate as Date).getTime())
      .slice(0, 5);
    
    // Update state with processed data
    setTotalRevenue(revenue);
    setOutstandingAmount(outstanding);
    setTotalCustomers(customers.length);
    setPendingInvoicesCount(pendingCount);
    setSalesData(chartData);
    setInvoiceStatusData(pieData);
    setTopCustomers(topCustomersData);
    setTopProducts(topProductsData);
    setRecentInvoices(sortedInvoices);
    setDailyTrend(trendData);
    setRevenueGrowth(growthRate);
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Helper function for status badge variant
  const statusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid": return "success";
      case "pending": return "warning";
      case "overdue": return "destructive";
      case "draft": return "outline";
      default: return "outline";
    }
  };

  // Custom active shape for pie chart
  const renderActiveShape = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
      fill, payload, percent, value } = props;
    const sin = Math.sin(-midAngle * Math.PI / 180);
    const cos = Math.cos(-midAngle * Math.PI / 180);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="text-sm">
          {payload.name}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="hsl(var(--foreground))" className="text-xs">{`${value} invoices`}</text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="hsl(var(--foreground))" className="text-xs">
          {`(${(percent * 100).toFixed(0)}%)`}
        </text>
      </g>
    );
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <Activity className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Dashboard" 
          description="Overview of your business performance"
        />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchDashboardData} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Financial Dashboard" 
        description="Real-time insights and analytics for your business"
        actions={
          <Button onClick={fetchDashboardData} variant="outline" size="sm" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh Data
          </Button>
        }
      />
      
      {/* KPI Cards Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-background border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <CircleDollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</div>
            <div className="flex items-center pt-1">
              <Badge variant={revenueGrowth >= 0 ? "success" : "destructive"} className="text-xs">
                {revenueGrowth >= 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                {Math.abs(revenueGrowth).toFixed(1)}%
              </Badge>
              <span className="text-xs text-muted-foreground ml-2">from previous period</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-background border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Amount</CardTitle>
            <div className="rounded-full bg-destructive/10 p-2 text-destructive">
              <FileWarning className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{outstandingAmount.toLocaleString('en-IN')}</div>
            <div className="flex items-center pt-1">
              <span className="text-xs text-muted-foreground">From {pendingInvoicesCount} pending invoices</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-background border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <div className="rounded-full bg-blue-500/10 p-2 text-blue-500">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <div className="flex items-center pt-1">
              <span className="text-xs text-muted-foreground">
                {topCustomers.length > 0 ? `Top customer: ${topCustomers[0].name}` : 'No customers yet'}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-background border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <div className="rounded-full bg-yellow-500/10 p-2 text-yellow-500">
              <Clock className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInvoicesCount}</div>
            <div className="flex items-center pt-1">
              <Link href="/invoices" className="text-xs text-primary flex items-center">
                View all invoices <ChevronRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart */}
        <Card className="lg:col-span-2 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <LineChartIcon className="h-5 w-5 mr-2 text-primary" />
                Revenue Trend
              </CardTitle>
              <CardDescription>Daily revenue for the past 30 days</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-[350px] p-2">
            <ChartContainer config={chartConfigSales} className="w-full h-full">
              <ResponsiveContainer>
                <AreaChart data={dailyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.5)" />
                  <XAxis 
                    dataKey="date" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value, index) => index % 3 === 0 ? value : ''}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                    tickFormatter={(value) => `₹${value/1000}k`}
                  />
                  <ChartTooltip
                    cursor={{fill: 'hsl(var(--accent)/0.1)'}}
                    content={<ChartTooltipContent 
                      indicator="dot" 
                      formatter={(value, name, props) => (
                        <div className="flex flex-col">
                          <span>{props.payload.date}</span>
                          <span className="font-bold">₹{Number(value).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                    />}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
            {dailyTrend.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No sales data available to display chart.</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Invoice Status Pie Chart */}
        <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChartIcon className="h-5 w-5 mr-2 text-primary" />
              Invoice Status
            </CardTitle>
            <CardDescription>Distribution by status</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  activeIndex={activeStatusIndex}
                  activeShape={renderActiveShape}
                  data={invoiceStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  onMouseEnter={(_, index) => setActiveStatusIndex(index)}
                >
                  {invoiceStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {invoiceStatusData.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No invoice status data available.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Receipt className="h-5 w-5 mr-2 text-primary" />
                Recent Invoices
              </CardTitle>
              <CardDescription>Latest transactions</CardDescription>
            </div>
            <Link href="/invoices" passHref>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-0">
            {recentInvoices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <Link href={`/invoices/${invoice.id}`} className="hover:underline text-primary">
                          {invoice.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{invoice.customerName}</TableCell>
                      <TableCell>
                        {format(new Date(invoice.invoiceDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>₹{invoice.amount.toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(invoice.status) as any} className="text-xs">
                          {invoice.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6 text-center">
                <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No recent invoice activity.</p>
                <Link href="/invoices/create" passHref>
                  <Button variant="link" className="mt-2">Create an Invoice</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Top Revenue Sources */}
        <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-primary" />
                Top Revenue Sources
              </CardTitle>
              <CardDescription>Your best performing products and customers</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Top Products */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center">
                  <Package className="h-4 w-4 mr-2" />
                  Top Products
                </h4>
                {topProducts.length > 0 ? (
                  <div className="space-y-2">
                    {topProducts.map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-6 text-muted-foreground text-sm">{index + 1}.</div>
                          <div className="font-medium">{product.name}</div>
                        </div>
                        <div className="font-mono">₹{product.totalAmount.toLocaleString('en-IN')}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No product data available</p>
                )}
              </div>
              
              {/* Top Customers */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Top Customers
                </h4>
                {topCustomers.length > 0 ? (
                  <div className="space-y-2">
                    {topCustomers.map((customer, index) => (
                      <div key={customer.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-6 text-muted-foreground text-sm">{index + 1}.</div>
                          <div className="font-medium">{customer.name}</div>
                        </div>
                        <div className="font-mono">₹{customer.totalAmount.toLocaleString('en-IN')}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No customer data available</p>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <div className="flex justify-between w-full text-sm">
              <Link href="/customers" className="text-primary flex items-center">
                View all customers <ChevronRight className="h-3 w-3 ml-1" />
              </Link>
              <Link href="/products" className="text-primary flex items-center">
                View all products <ChevronRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

