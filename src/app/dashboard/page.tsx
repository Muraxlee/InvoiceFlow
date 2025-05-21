
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { ArrowUpRight, ArrowDownRight, MoreHorizontal, ChevronRight, CalendarDays, Users, PieChart as PieChartIcon, BarChart2, Activity as ActivityIcon, MapPin as LocationIcon } from "lucide-react";
import ArcProgress from '@/components/ui/arc-progress'; // Assuming ArcProgress is kept or similar

const chartConfigLine = {
  desktop: { label: "Desktop", color: "hsl(var(--chart-1))" },
  mobile: { label: "Mobile", color: "hsl(var(--chart-2))" },
};
const chartConfigBar = {
  users: { label: "Users", color: "hsl(var(--chart-1))" },
};
const chartConfigPie = {
  desktop: { label: "Desktop", color: "hsl(var(--chart-1))" },
  tablet: { label: "Tablet", color: "hsl(var(--chart-3))" },
  mobile: { label: "Mobile", color: "hsl(var(--chart-2))" },
};

const overviewData = [
  { date: "Jan 1", desktop: 200, mobile: 150 }, { date: "Jan 7", desktop: 280, mobile: 220 },
  { date: "Jan 14", desktop: 250, mobile: 300 }, { date: "Jan 21", desktop: 350, mobile: 280 },
  { date: "Jan 28", desktop: 400, mobile: 320 }, { date: "Feb 4", desktop: 380, mobile: 450 },
  { date: "Feb 11", desktop: 420, mobile: 400 }, { date: "Feb 18", desktop: 500, mobile: 380 },
  { date: "Feb 25", desktop: 480, mobile: 520 },
];

const demographicsData = [
  { age: "18-24", users: 300 }, { age: "25-34", users: 500 }, { age: "35-44", users: 400 },
  { age: "45-54", users: 250 }, { age: "55-64", users: 150 }, { age: "65+", users: 100 },
];

const devicesData = [
  { name: 'Desktop', value: 52.4, color: 'hsl(var(--chart-1))' },
  { name: 'Tablet', value: 16.4, color: 'hsl(var(--chart-3))' },
  { name: 'Mobile', value: 31.2, color: 'hsl(var(--chart-2))' },
];

const acquisitionData = [
  { source: 'Google', visits: 71, pages: 2.4, time: '02:30', newVisits: 50, bounce: '32.7%' },
  { source: 'Facebook', visits: 56, pages: 1.8, time: '01:45', newVisits: 35, bounce: '45.1%' },
  { source: 'Instagram', visits: 42, pages: 4.1, time: '04:02', newVisits: 22, bounce: '18.5%' },
  { source: 'Twitter', visits: 27, pages: 1.4, time: '00:58', newVisits: 10, bounce: '60.0%' },
  { source: 'Yahoo', visits: 14, pages: 2.8, time: '02:10', newVisits: 7, bounce: '39.5%' },
];

const locationData = [
  { name: 'USA', percentage: '38.4%' }, { name: 'Canada', percentage: '27.8%' },
  { name: 'England', percentage: '16.9%' }, { name: 'Australia', percentage: '12.3%' },
];

export default function DashboardPage() {
  const [activeOverviewTime, setActiveOverviewTime] = useState("Day");

  return (
    <div className="flex flex-col gap-6">
      {/* Overview Module */}
      <Card className="col-span-1 lg:col-span-3 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Overview</CardTitle>
          <div className="flex items-center gap-1">
            {["Day", "Week", "Month", "Year"].map((time) => (
              <Button
                key={time}
                variant={activeOverviewTime === time ? "default" : "ghost"}
                size="sm"
                className={`text-xs px-2 py-1 h-auto ${activeOverviewTime === time ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                onClick={() => setActiveOverviewTime(time)}
              >
                {time}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3 h-[300px] md:h-[350px]">
            <ChartContainer config={chartConfigLine} className="w-full h-full">
              <ResponsiveContainer>
                <LineChart data={overviewData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.5)" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(value) => `${value}`} />
                  <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                  <ChartLegend content={<ChartLegendContent icon={Line} />} />
                  <Line type="monotone" dataKey="desktop" stroke="var(--color-desktop)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="mobile" stroke="var(--color-mobile)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
          <div className="md:col-span-1 space-y-4 py-4 md:border-l md:pl-4 border-border">
            {[
              { title: "Page Views", value: "120,495", trend: "+12.5%", positive: true },
              { title: "Bounce Rate", value: "22.5%", trend: "-2.1%", positive: false },
              { title: "Average Time", value: "04:39", trend: "+0.8s", positive: true },
            ].map(stat => (
              <div key={stat.title}>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className={`text-xs flex items-center ${stat.positive ? 'text-green-500' : 'text-red-500'}`}>
                  {stat.positive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                  {stat.trend}
                </p>
                 <div className="h-10 w-full bg-muted/20 rounded mt-1 overflow-hidden relative"> {/* Simple bar placeholder */}
                  <div className="h-full bg-primary/50" style={{ width: `${Math.random()*70+20}%` }}></div>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full mt-4">VIEW REPORTS <ChevronRight className="ml-1 h-4 w-4"/></Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Devices Module */}
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Devices</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4 text-muted-foreground" /></Button>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="h-[180px] w-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={devicesData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} strokeWidth={2}>
                    {devicesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                   <foreignObject x="35%" y="38%" width="30%" height="25%">
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="text-2xl font-bold text-foreground">9,204</div>
                        <div className="text-xs text-muted-foreground">Total users</div>
                    </div>
                  </foreignObject>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-1 text-sm">
              {devicesData.map(device => (
                <div key={device.name} className="flex justify-between items-center">
                  <span className="flex items-center">
                    <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: device.color }}></span>
                    {device.name}
                  </span>
                  <span className="font-medium text-foreground">{device.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Demographics Module */}
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Demographics</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4 text-muted-foreground" /></Button>
          </CardHeader>
          <CardContent className="h-[240px]">
             <ChartContainer config={chartConfigBar} className="w-full h-full">
                <ResponsiveContainer>
                    <BarChart data={demographicsData} layout="vertical" margin={{top: 5, right: 10, left: -20, bottom: 5}}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border)/0.5)" />
                        <XAxis type="number" tickLine={false} axisLine={{stroke: 'hsl(var(--border)/0.5)'}} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                        <YAxis dataKey="age" type="category" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} width={50}/>
                        <ChartTooltip cursor={{fill: 'hsl(var(--accent)/0.1)'}} content={<ChartTooltipContent indicator="line" />} />
                        <Bar dataKey="users" fill="var(--color-users)" radius={[0, 4, 4, 0]} barSize={12}/>
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* New Users Module */}
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">New Users</CardTitle>
             <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto px-1 py-0.5">Last 30 days <ChevronRight className="h-3 w-3 ml-0.5"/></Button>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <div className="relative h-[120px] w-[180px]">
              <ArcProgress percentage={70} color="hsl(var(--chart-2))" size={120} strokeWidth={12} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-foreground">587</span>
                <span className="text-xs text-muted-foreground">Daily average</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full text-center">
              <div>
                <p className="text-xl font-semibold text-foreground">6.43%</p>
                <p className="text-xs text-muted-foreground">New users growth</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-foreground">9.43%</p>
                <p className="text-xs text-muted-foreground">Conversion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Acquisition Module */}
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Acquisition</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4 text-muted-foreground" /></Button>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="border-t border-border">
                  <TableHead className="text-muted-foreground">Source</TableHead>
                  <TableHead className="text-muted-foreground">Visits</TableHead>
                  <TableHead className="text-muted-foreground">Pages</TableHead>
                  <TableHead className="text-muted-foreground">Time</TableHead>
                  <TableHead className="text-muted-foreground">New Visits</TableHead>
                  <TableHead className="text-muted-foreground text-right">Bounce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {acquisitionData.map((row) => (
                  <TableRow key={row.source} className="border-border">
                    <TableCell className="font-medium text-foreground">{row.source}</TableCell>
                    <TableCell className="text-muted-foreground">{row.visits}</TableCell>
                    <TableCell className="text-muted-foreground">{row.pages}</TableCell>
                    <TableCell className="text-muted-foreground">{row.time}</TableCell>
                    <TableCell className="text-muted-foreground">{row.newVisits}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{row.bounce}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Location Module */}
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Location</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4 text-muted-foreground" /></Button>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-4">
              {locationData.map(loc => (
                <li key={loc.name} className="flex justify-between items-center text-sm">
                  <span className="text-foreground">{loc.name}</span>
                  <span className="text-muted-foreground">{loc.percentage}</span>
                </li>
              ))}
            </ul>
             <div className="border-t border-border pt-4 grid grid-cols-2 gap-4">
                <div>
                    <p className="text-2xl font-bold text-foreground">64.24%</p>
                    <p className="text-xs text-muted-foreground">Goal Conversion Rate</p>
                </div>
                 <div>
                    <p className="text-2xl font-bold text-foreground">102.49</p>
                    <p className="text-xs text-muted-foreground">Goal Completions</p>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
