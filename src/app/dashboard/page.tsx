
"use client";

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, CartesianGrid, ResponsiveContainer, XAxis, YAxis, PieChart, Pie, Sector, Cell } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays, parseISO, isValid, isPast, startOfDay, isAfter, isToday, startOfMonth } from 'date-fns';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import {
  DollarSign, Users, FileWarning, Activity, ShoppingBag,
  Clock, LineChart as LineChartIcon, RefreshCw, AlertCircle,
  ArrowRight, ArrowUp, ArrowDown, PieChart as PieChartIcon, 
  CircleDollarSign, Receipt, Package, ChevronRight, BarChart3,
  Boxes, DraftingCompass, ShoppingCart, CalendarIcon
} from "lucide-react";
import type { StoredInvoice, Customer, Product, Employee, InventoryItem, Measurement, PurchaseInvoice } from '@/types/database';
import { getInvoices, getCustomers, getProducts, getEmployees, getInventoryItems, getMeasurements, getPurchaseInvoices } from '@/lib/firestore-actions';
import { cn } from '@/lib/utils';

const chartConfigSales = {
  revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
  invoices: { label: "Invoices", color: "hsl(var(--chart-2))" }
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2'];

type DashboardMetrics = {
    totalRevenue: number;
    totalPurchases: number;
    outstandingAmount: number;
    totalCustomers: number;
    totalEmployees: number;
    totalInventoryItems: number;
    pendingInvoicesCount: number;
    measurementsDueCount: number;
    salesData: { date: string; amount: number; }[];
    invoiceStatusData: { name: string; value: number; }[];
    topCustomers: { id: string; name: string; totalAmount: number; }[];
    topProducts: { id: string; name: string; totalAmount: number; }[];
    recentInvoices: StoredInvoice[];
    revenueGrowth: number;
};

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const { data: invoices, isLoading: isLoadingInvoices, error: invoicesError } = useQuery<StoredInvoice[]>({
    queryKey: ['invoices'],
    queryFn: getInvoices,
  });

  const { data: purchaseInvoices, isLoading: isLoadingPurchases, error: purchasesError } = useQuery<PurchaseInvoice[]>({
    queryKey: ['purchaseInvoices'],
    queryFn: getPurchaseInvoices,
  });

  const { data: customers, isLoading: isLoadingCustomers, error: customersError } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  const { data: products, isLoading: isLoadingProducts, error: productsError } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const { data: employees, isLoading: isLoadingEmployees, error: employeesError } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: getEmployees,
  });

  const { data: inventoryItems, isLoading: isLoadingInventory, error: inventoryError } = useQuery<InventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: getInventoryItems,
  });

  const { data: measurements, isLoading: isLoadingMeasurements, error: measurementsError } = useQuery<Measurement[]>({
    queryKey: ['measurements'],
    queryFn: getMeasurements,
  });
  
  const isLoading = isLoadingInvoices || isLoadingCustomers || isLoadingProducts || isLoadingEmployees || isLoadingInventory || isLoadingMeasurements || isLoadingPurchases;
  const error = invoicesError || customersError || productsError || employeesError || inventoryError || measurementsError || purchasesError;

  useEffect(() => {
    if (invoices && customers && products && employees && inventoryItems && measurements && purchaseInvoices) {

        const filteredInvoices = invoices.filter(inv => {
            const invoiceDate = new Date(inv.invoiceDate);
            if(startDate && invoiceDate < startOfDay(startDate)) return false;
            if(endDate && invoiceDate > startOfDay(endDate)) return false;
            return true;
        });
        
        const filteredPurchases = purchaseInvoices.filter(p => {
            const purchaseDate = new Date(p.date);
            if(startDate && purchaseDate < startOfDay(startDate)) return false;
            if(endDate && purchaseDate > startOfDay(endDate)) return false;
            return true;
        });

        let revenue = 0;
        let outstanding = 0;
        let pendingCount = 0;
        const statusCounts: Record<string, number> = { "Paid": 0, "Pending": 0, "Overdue": 0, "Draft": 0, "Unpaid": 0, "Partially Paid": 0 };
        const customerSales: Record<string, number> = {};
        const productSales: Record<string, number> = {};
        
        const today = startOfDay(new Date());
        const thirtyDaysAgo = subDays(today, 29);
        const fifteenDaysAgo = subDays(today, 14);

        const last30DaysDates = Array.from({ length: 30 }, (_, i) => format(subDays(today, i), 'yyyy-MM-dd')).reverse();
        const dailySales: Record<string, number> = {};
        last30DaysDates.forEach(date => { dailySales[date] = 0; });
        
        filteredInvoices.forEach(invoice => {
          const invDate = new Date(invoice.invoiceDate);
          if (!isValid(invDate)) return;

          let status = invoice.status || "Unpaid";
          if (isPast(new Date(invoice.dueDate || 0)) && (status === 'Unpaid' || status === 'Partially Paid' || status === 'Pending')) {
            status = 'Overdue';
          }
          statusCounts[status] = (statusCounts[status] || 0) + 1;
          
          if (status === "Paid") {
            revenue += invoice.amount || 0;
            const dateStr = format(invDate, 'yyyy-MM-dd');
            if (dateStr in dailySales) {
              dailySales[dateStr] += invoice.amount || 0;
            }
            customerSales[invoice.customerId] = (customerSales[invoice.customerId] || 0) + (invoice.amount || 0);
            invoice.items?.forEach(item => {
              productSales[item.productId] = (productSales[item.productId] || 0) + (item.quantity * item.price);
            });
          } else if (["Pending", "Overdue", "Unpaid", "Partially Paid", "Draft"].includes(status)) {
            outstanding += invoice.amount || 0;
            if (status !== 'Draft') {
              pendingCount++;
            }
          }
        });

        const totalPurchases = filteredPurchases
          .filter(p => p.status === 'Paid')
          .reduce((sum, p) => sum + p.amount, 0);

        const recentRevenue = Object.entries(dailySales)
            .filter(([date]) => isAfter(parseISO(date), fifteenDaysAgo))
            .reduce((sum, [, amount]) => sum + amount, 0);

        const previousRevenue = Object.entries(dailySales)
            .filter(([date]) => !isAfter(parseISO(date), fifteenDaysAgo) && isAfter(parseISO(date), thirtyDaysAgo))
            .reduce((sum, [, amount]) => sum + amount, 0);

        const growthRate = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : (recentRevenue > 0 ? 100 : 0);

        const topCustomers = Object.entries(customerSales)
          .map(([id, totalAmount]) => ({ id, name: customers.find(c => c.id === id)?.name || 'Unknown', totalAmount }))
          .sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 5);
          
        const topProducts = Object.entries(productSales)
          .map(([id, totalAmount]) => ({ id, name: products.find(p => p.id === id)?.name || 'Unknown', totalAmount }))
          .sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 5);
          
        const trendData = last30DaysDates.map(date => ({ date: format(parseISO(date), 'MMM dd'), amount: dailySales[date] || 0 }));
        
        const recentInvoices = [...invoices]
          .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()).slice(0, 5);

        const measurementsDueCount = measurements.filter(m => {
          if (!m.deliveryDate) return false;
          const deliveryDate = new Date(m.deliveryDate);
          return isValid(deliveryDate) && isToday(deliveryDate);
        }).length;
        
        setDashboardMetrics({
            totalRevenue: revenue,
            totalPurchases,
            outstandingAmount: outstanding,
            totalCustomers: customers.length,
            totalEmployees: employees.length,
            totalInventoryItems: inventoryItems.reduce((acc, item) => acc + item.stock, 0),
            pendingInvoicesCount: pendingCount,
            measurementsDueCount,
            salesData: trendData,
            invoiceStatusData: Object.entries(statusCounts)
              .filter(([,value]) => value > 0)
              .map(([name, value]) => ({ name: name || 'Unpaid', value })),
            topCustomers,
            topProducts,
            recentInvoices,
            revenueGrowth: growthRate,
        });
    }
  }, [invoices, customers, products, employees, inventoryItems, measurements, purchaseInvoices, startDate, endDate]);


  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['purchaseInvoices'] });
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['measurements'] });
  };

  const [activeStatusIndex, setActiveStatusIndex] = useState(0);
  
  const statusVariant = (invoiceStatus?: string, dueDate?: Date | string | null) => {
    let status = invoiceStatus?.toLowerCase() || 'unpaid';
    if (dueDate && isPast(new Date(dueDate)) && (status === 'unpaid' || status === 'pending' || status === 'partially paid')) {
      status = 'overdue';
    }
    
    switch (status) {
      case "paid": return "success";
      case "pending": return "warning";
      case "overdue": return "destructive";
      case "draft": return "outline";
      case "unpaid": return "warning";
      case "partially paid": return "info";
      default: return "outline";
    }
  };

  const renderActiveShape = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
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
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 6} outerRadius={outerRadius + 10} fill={fill} />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="hsl(var(--foreground))" className="text-xs">{`${value} invoices`}</text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="hsl(var(--foreground))" className="text-xs">
          {`(${(percent * 100).toFixed(0)}%)`}
        </text>
      </g>
    );
  };
  
  if (isLoading || !dashboardMetrics) {
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
        <PageHeader title="Dashboard" description="Overview of your business performance" />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error: Missing or Insufficient Permissions</AlertTitle>
          <AlertDescription>
            <p>The application cannot access the database. This is usually because the Firestore security rules have not been deployed to your project.</p>
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

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Financial Dashboard" 
        description="Real-time insights and analytics for your business"
        actions={ <Button onClick={() => refetch()} variant="outline" size="sm" className="flex items-center gap-2"> <RefreshCw className="h-4 w-4" /> Refresh Data </Button> }
      />
      
      <Card>
        <CardContent className="pt-6 flex flex-wrap gap-4 items-center">
            <div className="flex gap-2 items-center">
                <Label>From:</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-[240px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
                    </PopoverContent>
                </Popover>
            </div>
             <div className="flex gap-2 items-center">
                <Label>To:</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-[240px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
                    </PopoverContent>
                </Popover>
            </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-background border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (Paid)</CardTitle>
            <div className="rounded-full bg-primary/10 p-2 text-primary"> <CircleDollarSign className="h-5 w-5" /> </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{dashboardMetrics.totalRevenue.toLocaleString('en-IN')}</div>
            <div className="flex items-center pt-1">
              <Badge variant={dashboardMetrics.revenueGrowth >= 0 ? "success" : "destructive"} className="text-xs">
                {dashboardMetrics.revenueGrowth >= 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                {Math.abs(dashboardMetrics.revenueGrowth).toFixed(1)}%
              </Badge>
              <span className="text-xs text-muted-foreground ml-2">vs. prior 15 days (30-day trend)</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-background border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
            <div className="rounded-full bg-red-500/10 p-2 text-red-500"> <ShoppingCart className="h-5 w-5" /> </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{dashboardMetrics.totalPurchases.toLocaleString('en-IN')}</div>
            <div className="flex items-center pt-1">
              <span className="text-xs text-muted-foreground">From all paid purchases</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-background border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Amount</CardTitle>
            <div className="rounded-full bg-destructive/10 p-2 text-destructive"> <FileWarning className="h-5 w-5" /> </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{dashboardMetrics.outstandingAmount.toLocaleString('en-IN')}</div>
            <div className="flex items-center pt-1">
              <span className="text-xs text-muted-foreground">From {dashboardMetrics.pendingInvoicesCount} invoices</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-background border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Measurements Due</CardTitle>
            <div className="rounded-full bg-orange-500/10 p-2 text-orange-500"> <DraftingCompass className="h-5 w-5" /> </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics.measurementsDueCount}</div>
            <div className="flex items-center pt-1">
              <span className="text-xs text-muted-foreground">due for delivery today</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-background border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <div className="rounded-full bg-blue-500/10 p-2 text-blue-500"> <Users className="h-5 w-5" /> </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics.totalCustomers}</div>
            <div className="flex items-center pt-1">
              <span className="text-xs text-muted-foreground truncate">
                {
                  dashboardMetrics.totalCustomers === 0
                    ? 'No customers yet'
                    : dashboardMetrics.topCustomers.length > 0
                    ? `Top customer: ${dashboardMetrics.topCustomers[0].name}`
                    : 'No paid invoices to rank customers'
                }
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-background border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <div className="rounded-full bg-indigo-500/10 p-2 text-indigo-500"> <DraftingCompass className="h-5 w-5" /> </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics.totalEmployees}</div>
            <div className="flex items-center pt-1">
              <Link href="/employees" className="text-xs text-primary flex items-center">
                Manage employees <ChevronRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-background border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Items</CardTitle>
            <div className="rounded-full bg-teal-500/10 p-2 text-teal-500"> <Boxes className="h-5 w-5" /> </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics.totalInventoryItems}</div>
            <div className="flex items-center pt-1">
              <Link href="/inventory" className="text-xs text-primary flex items-center">
                Manage inventory <ChevronRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-background border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <div className="rounded-full bg-yellow-500/10 p-2 text-yellow-500"> <Clock className="h-5 w-5" /> </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics.pendingInvoicesCount}</div>
            <div className="flex items-center pt-1">
              <Link href="/invoices?status=pending" className="text-xs text-primary flex items-center">
                View all invoices <ChevronRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between">
            <div> <CardTitle className="flex items-center"> <LineChartIcon className="h-5 w-5 mr-2 text-primary" /> Revenue Trend </CardTitle> <CardDescription>Daily revenue for the past 30 days</CardDescription> </div>
          </CardHeader>
          <CardContent className="h-[350px] p-2">
            <ChartContainer config={chartConfigSales} className="w-full h-full">
              <ResponsiveContainer>
                <AreaChart data={dashboardMetrics.salesData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.5)" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(value, index) => index % 3 === 0 ? value : ''} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(value) => `₹${value/1000}k`} />
                  <ChartTooltip cursor={{fill: 'hsl(var(--accent)/0.1)'}} content={<ChartTooltipContent indicator="dot" formatter={(value, name, props) => (<div className="flex flex-col"><span>{props.payload.date}</span><span className="font-bold">₹{Number(value).toLocaleString('en-IN')}</span></div>)} />} />
                  <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
            {dashboardMetrics.salesData.every(d => d.amount === 0) && ( <div className="flex items-center justify-center h-full"> <p className="text-muted-foreground">No sales data available to display chart.</p> </div> )}
          </CardContent>
        </Card>
        
        <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader> <CardTitle className="flex items-center"> <PieChartIcon className="h-5 w-5 mr-2 text-primary" /> Invoice Status </CardTitle> <CardDescription>Distribution by status</CardDescription> </CardHeader>
          <CardContent className="h-[350px] p-2">
            {dashboardMetrics.invoiceStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie activeIndex={activeStatusIndex} activeShape={renderActiveShape} data={dashboardMetrics.invoiceStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" dataKey="value" onMouseEnter={(_, index) => setActiveStatusIndex(index)}>
                    {dashboardMetrics.invoiceStatusData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} /> ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-center">No invoice status data available.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between">
            <div> <CardTitle className="flex items-center"> <Receipt className="h-5 w-5 mr-2 text-primary" /> Recent Invoices </CardTitle> <CardDescription>Latest transactions</CardDescription> </div>
            <Link href="/invoices" passHref> <Button variant="outline" size="sm" className="flex items-center gap-2"> View All <ArrowRight className="h-4 w-4" /> </Button> </Link>
          </CardHeader>
          <CardContent className="px-0">
            {dashboardMetrics.recentInvoices.length > 0 ? (
              <Table>
                <TableHeader> <TableRow> <TableHead>Invoice</TableHead> <TableHead>Customer</TableHead> <TableHead>Date</TableHead> <TableHead>Amount</TableHead> <TableHead>Status</TableHead> </TableRow> </TableHeader>
                <TableBody>
                  {dashboardMetrics.recentInvoices.map((invoice) => {
                    const status = invoice.dueDate && isPast(new Date(invoice.dueDate)) && invoice.status !== 'Paid' ? 'Overdue' : invoice.status;
                    return (
                      <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium"> <Link href={`/invoices/${invoice.id}`} className="hover:underline text-primary"> {invoice.invoiceNumber} </Link> </TableCell>
                        <TableCell>{invoice.customerName}</TableCell>
                        <TableCell> {format(new Date(invoice.invoiceDate), 'dd MMM yyyy')} </TableCell>
                        <TableCell>₹{(invoice.amount || 0).toLocaleString('en-IN')}</TableCell>
                        <TableCell> <Badge variant={statusVariant(status, new Date(invoice.dueDate || ''))} className="text-xs"> {status || 'Unpaid'} </Badge> </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6 text-center">
                <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No recent invoice activity.</p>
                <Link href="/invoices/create" passHref> <Button variant="link" className="mt-2">Create an Invoice</Button> </Link>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between">
            <div> <CardTitle className="flex items-center"> <BarChart3 className="h-5 w-5 mr-2 text-primary" /> Top Revenue Sources </CardTitle> <CardDescription>Your best performing products and customers</CardDescription> </div>
            <Link href="/reports" passHref> <Button variant="outline" size="sm" className="flex items-center gap-2"> Full Report <ArrowRight className="h-4 w-4" /> </Button> </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Top Customers</h4>
              {dashboardMetrics.topCustomers.length > 0 ? (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {dashboardMetrics.topCustomers.map(c => (
                    <li key={c.id} className="flex justify-between items-center"><span>{c.name}</span><span className="font-medium text-foreground">₹{c.totalAmount.toLocaleString('en-IN')}</span></li>
                  ))}
                </ul>
              ) : (<p className="text-sm text-muted-foreground text-center py-2">No customer sales data</p>)}
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Top Products</h4>
              {dashboardMetrics.topProducts.length > 0 ? (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {dashboardMetrics.topProducts.map(p => (
                    <li key={p.id} className="flex justify-between items-center"><span>{p.name}</span><span className="font-medium text-foreground">₹{p.totalAmount.toLocaleString('en-IN')}</span></li>
                  ))}
                </ul>
              ) : (<p className="text-sm text-muted-foreground text-center py-2">No product sales data</p>)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
