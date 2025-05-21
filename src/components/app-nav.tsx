
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
  UsersRound, // For Customers
  FileText, // For Invoices
  Package, // For Products
  BarChart3, // For Reports
  Settings as SettingsIcon, // For Settings
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  tooltip: string;
};

const businessManagementNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, tooltip: 'Business Overview' },
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
              isActive && "bg-sidebar-primary text-sidebar-primary-foreground font-medium",
              !isActive && "font-normal"
            )}
          >
            {isActive && (
              <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-sm group-[[data-state=collapsed]]:hidden"></span>
            )}
            <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70")} />
            <span className="group-[[data-state=collapsed]]:hidden ml-2">{item.label}</span>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    );
  };

  return (
    <SidebarMenu className="group-[[data-state=collapsed]]:px-0 gap-0.5">
      {businessManagementNavItems.map(item => renderNavItem(item))}
    </SidebarMenu>
  );
}
