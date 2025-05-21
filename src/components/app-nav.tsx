
// src/components/app-nav.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Zap, // For Shortcuts
  ListChecks, // For Events
  Activity, // For Real Time
  Users, // For Audience (Quanti)
  Target, // For Conversion
  Settings as SettingsIcon, // For Settings
  FileText, // For Invoices
  Package, // For Products
  BarChart3, // For Reports
  UsersRound, // For Customers
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  tooltip: string;
};

// Nav items based on Quanti Analytics screenshot
const quantiNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, tooltip: 'Dashboard Overview' },
  { href: '/shortcuts', label: 'Shortcuts', icon: Zap, tooltip: 'Your Shortcuts' },
  { href: '/events', label: 'Events', icon: ListChecks, tooltip: 'Track Events' },
  { href: '/real-time', label: 'Real Time', icon: Activity, tooltip: 'Real Time Analytics' },
  { href: '/audience', label: 'Audience', icon: Users, tooltip: 'Audience Insights' },
  { href: '/conversion', label: 'Conversion', icon: Target, tooltip: 'Conversion Funnels' },
];

// Original app pages for business management
const businessManagementNavItems: NavItem[] = [
  { href: '/invoices', label: 'Invoices', icon: FileText, tooltip: 'Manage Invoices' },
  { href: '/customers', label: 'Customers', icon: UsersRound, tooltip: 'Manage Customers' },
  { href: '/products', label: 'Products', icon: Package, tooltip: 'Manage Products' },
  { href: '/reports', label: 'Reports', icon: BarChart3, tooltip: 'View Reports & AI Advisor' },
  { href: '/settings', label: 'Settings', icon: SettingsIcon, tooltip: 'Application Settings' },
];

export function AppNav() {
  const pathname = usePathname();

  const renderNavItem = (item: NavItem) => {
    const isActive = pathname === item.href || (item.href === "/dashboard" && pathname === "/");

    return (
      <SidebarMenuItem key={item.href} className="relative">
        <Link href={item.href} legacyBehavior passHref>
          <SidebarMenuButton
            isActive={isActive}
            tooltip={{ children: item.tooltip, className: "group-[[data-state=expanded]]:hidden" }}
            aria-label={item.tooltip}
            className={cn(
              "justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-2.5 pl-3 pr-2 group-[[data-state=collapsed]]:pl-0 group-[[data-state=collapsed]]:justify-center",
              isActive && "bg-sidebar-primary text-sidebar-primary-foreground font-medium", // Updated active style
              !isActive && "font-normal"
            )}
          >
            {isActive && (
              <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-sm group-[[data-state=collapsed]]:hidden"></span>
            )}
            <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary" : "text-sidebar-foreground/70")} />
            <span className="group-[[data-state=collapsed]]:hidden ml-2">{item.label}</span>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    );
  };

  return (
    <SidebarMenu className="group-[[data-state=collapsed]]:px-0 gap-0.5"> 
      {quantiNavItems.map(item => renderNavItem(item))}
      <SidebarSeparator className="my-2 group-data-[collapsible=icon]:hidden" />
      <div className="px-2 group-[[data-state=expanded]]:block group-[[data-state=collapsed]]:hidden mb-1">
        <span className="text-xs font-semibold text-sidebar-foreground/60">Management</span>
      </div>
      {businessManagementNavItems.map(item => renderNavItem(item))}
    </SidebarMenu>
  );
}
