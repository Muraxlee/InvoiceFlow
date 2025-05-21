"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  BarChart3,
  SettingsIcon,
  FilePlus2,
  FileArchive,
  LineChart,
  UsersRound,
  FileBox,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  tooltip: string;
  subItems?: NavItem[];
  isSubItem?: boolean;
};

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, tooltip: 'Dashboard' },
  {
    href: '/invoices',
    label: 'Invoices',
    icon: FileText,
    tooltip: 'Invoices',
    subItems: [
      { href: '/invoices', label: 'Manage Invoices', icon: FileArchive, tooltip: 'Manage Invoices', isSubItem: true },
      { href: '/invoices/create', label: 'Create Invoice', icon: FilePlus2, tooltip: 'Create Invoice', isSubItem: true },
    ],
  },
  { href: '/customers', label: 'Customers', icon: Users, tooltip: 'Customers' },
  { href: '/products', label: 'Products', icon: Package, tooltip: 'Products' },
  {
    href: '/reports',
    label: 'Reports',
    icon: BarChart3,
    tooltip: 'Reports',
    // Sub-items could be direct links or handled on the /reports page
    // For now, let's make them distinct for clarity in nav if desired
    // Or they can be sections on the /reports page itself.
    // Let's keep it simple, sub-reports are sections on /reports page.
  },
  { href: '/settings', label: 'Settings', icon: SettingsIcon, tooltip: 'Settings' },
];


export function AppNav() {
  const pathname = usePathname();

  const renderNavItem = (item: NavItem, isSub?: boolean) => {
    const isActive = item.subItems 
      ? pathname.startsWith(item.href) 
      : pathname === item.href;

    if (item.subItems && item.subItems.length > 0) {
      return (
        <Accordion type="single" collapsible className="w-full" key={item.href}>
          <AccordionItem value={item.href} className="border-none">
            <SidebarMenuItem className="p-0">
              <AccordionTrigger 
                className={cn(
                  "flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg:first-child]:size-4 [&>svg:first-child]:shrink-0",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                  "[&[data-state=open]>svg:last-child]:rotate-180"
                )}
              >
                <item.icon />
                <span className="group-[[data-state=collapsed]]:hidden">{item.label}</span>
              </AccordionTrigger>
            </SidebarMenuItem>
            <AccordionContent className="pb-0 pl-3 group-[[data-state=collapsed]]:hidden">
              <SidebarMenuSub>
                {item.subItems.map((subItem) => (
                  <SidebarMenuSubItem key={subItem.href}>
                    <Link href={subItem.href} legacyBehavior passHref>
                      <SidebarMenuSubButton
                        isActive={pathname === subItem.href}
                        aria-label={subItem.tooltip}
                        className="justify-start"
                      >
                        <subItem.icon className="mr-2 h-4 w-4 shrink-0" />
                        <span className="group-[[data-state=collapsed]]:hidden">{subItem.label}</span>
                      </SidebarMenuSubButton>
                    </Link>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    }

    return (
      <SidebarMenuItem key={item.href}>
        <Link href={item.href} legacyBehavior passHref>
          <SidebarMenuButton
            isActive={isActive}
            tooltip={{ children: item.tooltip, className: "group-[[data-state=expanded]]:hidden" }}
            aria-label={item.tooltip}
            className="justify-start"
          >
            <item.icon />
            <span className="group-[[data-state=collapsed]]:hidden">{item.label}</span>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    );
  };

  return (
    <SidebarMenu>
      {navItems.map(item => renderNavItem(item))}
    </SidebarMenu>
  );
}
