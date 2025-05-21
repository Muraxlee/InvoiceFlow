// src/components/app-nav.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  // SidebarMenuSub, // Keep if sub-menus might come back
  // SidebarMenuSubButton,
  // SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  BarChart3,
  SettingsIcon,
  MessageSquare, // Icon for Chat
  // FilePlus2, // Already used, for create invoice
  // FileArchive, // Already used for manage invoices
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
// Accordion imports removed as the new design implies simpler navigation

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  tooltip: string;
  // subItems?: NavItem[]; // Removed for simplicity, matching Creatio's flat nav
  isSubItem?: boolean;
};

// Simplified nav items to match the Creatio example structure (Home, Feed, Leads, Opportunities, Activities, Chat)
// Assuming current pages map to these broadly.
const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Home page', icon: LayoutDashboard, tooltip: 'Dashboard' },
  // { href: '/feed', label: 'Feed', icon: Rss, tooltip: 'Activity Feed' }, // Example, if a feed page exists
  { href: '/invoices', label: 'Invoices', icon: FileText, tooltip: 'Invoices' }, // Was "Leads" in Creatio example
  { href: '/customers', label: 'Customers', icon: Users, tooltip: 'Customers' }, // Was "Opportunities"
  { href: '/products', label: 'Products', icon: Package, tooltip: 'Products' }, // Was "Activities"
  { href: '/reports', label: 'Reports', icon: BarChart3, tooltip: 'Reports' }, // Was "Chat" - using a more generic icon
  { href: '/settings', label: 'Settings', icon: SettingsIcon, tooltip: 'Settings' },
];


export function AppNav() {
  const pathname = usePathname();

  const renderNavItem = (item: NavItem) => {
    const isActive = pathname.startsWith(item.href) && (item.href !== '/' || pathname === '/');
    // Simplified active check: if href is /dashboard, it's active only if pathname is exactly /dashboard.
    // For other routes, if pathname starts with item.href, it's active.
    // This handles /invoices being active for /invoices/create too.

    // Direct rendering without accordion for a flatter navigation like Creatio
    return (
      <SidebarMenuItem key={item.href}>
        <Link href={item.href} legacyBehavior passHref>
          <SidebarMenuButton
            isActive={isActive}
            tooltip={{ children: item.tooltip, className: "group-[[data-state=expanded]]:hidden" }}
            aria-label={item.tooltip}
            className={cn(
              "justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive && "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
            )}
          >
            <item.icon className={cn(isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/80")} />
            <span className="group-[[data-state=collapsed]]:hidden">{item.label}</span>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    );
  };

  return (
    // Added px-2 for padding around the menu items, adjust as needed
    <SidebarMenu className="px-2 group-[[data-state=collapsed]]:px-0"> 
      {navItems.map(item => renderNavItem(item))}
    </SidebarMenu>
  );
}
