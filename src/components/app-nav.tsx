// src/components/app-nav.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Zap, // For Shortcuts
  ListChecks, // For Events
  Activity, // For Real Time
  Users, // For Audience
  Target, // For Conversion
  SettingsIcon, // Keeping settings
  FileText, // Keeping invoices
  Package, // Keeping products
  BarChart3, // Keeping reports
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

// Keeping original app pages for now, can be removed or integrated later
const originalAppNavItems: NavItem[] = [
  { href: '/invoices', label: 'Invoices', icon: FileText, tooltip: 'Manage Invoices' },
  { href: '/customers', label: 'Customers', icon: Users, tooltip: 'Manage Customers' },
  { href: '/products', label: 'Products', icon: Package, tooltip: 'Manage Products' },
  { href: '/reports', label: 'Reports', icon: BarChart3, tooltip: 'View Reports' },
  { href: '/settings', label: 'Settings', icon: SettingsIcon, tooltip: 'Application Settings' },
];

// For this UI overhaul, we prioritize QuantiNavItems.
// If you want to integrate the original items, they can be added to this list or a separate menu.
const navItems = quantiNavItems; 

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
              isActive && "bg-sidebar-accent text-sidebar-primary-foreground font-medium",
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
    // Removed px-2 from SidebarMenu to allow full-width control for items
    <SidebarMenu className="group-[[data-state=collapsed]]:px-0 gap-0.5"> 
      {navItems.map(item => renderNavItem(item))}
    </SidebarMenu>
  );
}
