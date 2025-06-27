
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
  UsersRound,
  FileText,
  Package,
  BarChart3,
  Settings as SettingsIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  tooltip: string;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, tooltip: 'Business Overview' },
  { href: '/invoices', label: 'Invoices', icon: FileText, tooltip: 'Manage Invoices' },
  { href: '/customers', label: 'Customers', icon: UsersRound, tooltip: 'Manage Customers' },
  { href: '/products', label: 'Products', icon: Package, tooltip: 'Manage Products' },
  { href: '/reports', label: 'Reports', icon: BarChart3, tooltip: 'View Reports & AI Advisor' },
  { href: '/settings', label: 'Settings', icon: SettingsIcon, tooltip: 'Application Settings' },
];

export function AppNav() {
  const pathname = usePathname();
  const { appUser } = useAuth();
  const userRole = appUser?.role || 'user';

  const renderNavItem = (item: NavItem) => {
    if (item.adminOnly && userRole !== 'admin') {
      return null;
    }
    
    const isActive = pathname === item.href || (item.href === "/dashboard" && pathname === "/");

    const buttonClass = cn(
      "justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-2.5 pl-3 pr-2 group-[[data-state=collapsed]]:pl-0 group-[[data-state=collapsed]]:justify-center",
      isActive && "bg-sidebar-primary text-sidebar-primary-foreground font-medium",
      !isActive && "font-normal"
    );

    return (
      <SidebarMenuItem key={item.href} className="relative">
        <Link href={item.href}>
          <SidebarMenuButton
            isActive={isActive}
            tooltip={{ children: item.tooltip, className: "group-[[data-state=expanded]]:hidden" }}
            aria-label={item.tooltip}
            className={buttonClass}
          >
            {isActive && (
              <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-sm group-[[data-state=collapsed]]:hidden"></span>
            )}
            <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/70")} />
            <span className={cn("group-[[data-state=collapsed]]:hidden ml-2")}>{item.label}</span>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    );
  };

  return (
    <SidebarMenu className="group-[[data-state=collapsed]]:px-0 gap-0.5">
      {navItems.map(item => renderNavItem(item))}
    </SidebarMenu>
  );
}
