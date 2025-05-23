
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
  Users as UsersIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useState } from 'react';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  tooltip: string;
  adminOnly?: boolean;
  subItems?: NavItem[];
};

const businessManagementNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, tooltip: 'Business Overview' },
  { href: '/invoices', label: 'Invoices', icon: FileText, tooltip: 'Manage Invoices' },
  { href: '/customers', label: 'Customers', icon: UsersRound, tooltip: 'Manage Customers' },
  { href: '/products', label: 'Products', icon: Package, tooltip: 'Manage Products' },
  { href: '/reports', label: 'Reports', icon: BarChart3, tooltip: 'View Reports & AI Advisor' },
  {
    href: '/settings',
    label: 'Settings',
    icon: SettingsIcon,
    tooltip: 'Application Settings',
    adminOnly: true,
    subItems: [
      { href: '/settings/users', label: 'User Management', icon: UsersIcon, tooltip: 'Manage Users', adminOnly: true },
    ]
  },
];

export function AppNav() {
  const pathname = usePathname();
  const userRole = 'admin'; // Placeholder

  const [openAccordionItem, setOpenAccordionItem] = useState<string | undefined>(() => {
    const activeParent = businessManagementNavItems.find(item =>
      item.subItems?.some(subItem => pathname.startsWith(subItem.href))
    );
    return activeParent?.href;
  });

  const renderNavItem = (item: NavItem, isSubItem = false) => {
    // For regular items or sub-items, isActive is a direct match or if it's the dashboard route at root.
    // For a parent item like "Settings", it's active if the current path starts with its href.
    const isActive = isSubItem 
      ? pathname === item.href
      : (pathname === item.href || (item.href === "/dashboard" && pathname === "/") || (item.subItems && pathname.startsWith(item.href)));

    const buttonClass = cn(
      "justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-2.5 pl-3 pr-2 group-[[data-state=collapsed]]:pl-0 group-[[data-state=collapsed]]:justify-center",
      isActive && !isSubItem && "bg-sidebar-primary text-sidebar-primary-foreground font-medium", // Parent active style
      isActive && isSubItem && "bg-sidebar-accent text-sidebar-accent-foreground font-medium", // Sub-item active style
      !isActive && "font-normal",
      isSubItem && "pl-8 text-sm h-9 group-[[data-state=collapsed]]:hidden"
    );

    return (
      <SidebarMenuItem key={item.href} className="relative">
        <Link href={item.href} legacyBehavior passHref>
          <SidebarMenuButton
            isActive={isActive}
            tooltip={{ children: item.tooltip, className: "group-[[data-state=expanded]]:hidden" }}
            aria-label={item.tooltip}
            className={buttonClass}
          >
            {isActive && !isSubItem && ( // Active indicator for parent items
              <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-sm group-[[data-state=collapsed]]:hidden"></span>
            )}
            <item.icon className={cn("h-5 w-5 shrink-0", isActive ? (isSubItem ? "text-sidebar-accent-foreground":"text-sidebar-primary-foreground") : "text-sidebar-foreground/70", isSubItem && "h-4 w-4")} />
            <span className={cn("group-[[data-state=collapsed]]:hidden ml-2", isSubItem && "ml-1")}>{item.label}</span>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    );
  };

  return (
    <SidebarMenu className="group-[[data-state=collapsed]]:px-0 gap-0.5">
      <Accordion
        type="single"
        collapsible
        value={openAccordionItem}
        onValueChange={setOpenAccordionItem}
        className="w-full group-[[data-state=collapsed]]:hidden"
      >
        {businessManagementNavItems.map(item => {
          if (item.subItems && item.subItems.length > 0) {
            const isParentSettingsActive = pathname.startsWith(item.href);
            return (
              <AccordionItem value={item.href} key={item.href} className="border-none">
                <SidebarMenuItem className="relative mb-0">
                  <AccordionTrigger
                    className={cn(
                      "flex items-center justify-between w-full text-left", 
                      "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-2.5 pl-3 pr-2 group-[[data-state=collapsed]]:pl-0 group-[[data-state=collapsed]]:justify-center hover:no-underline",
                      isParentSettingsActive && "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    )}
                  >
                    <Link href={item.href} legacyBehavior passHref>
                      <a className="flex items-center flex-grow mr-2"> {/* Link wraps icon and label */}
                        {isParentSettingsActive && (
                           <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-sm group-[[data-state=collapsed]]:hidden"></span>
                        )}
                        <item.icon className={cn("h-5 w-5 shrink-0", isParentSettingsActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/70")} />
                        <span className="group-[[data-state=collapsed]]:hidden ml-2">{item.label}</span>
                      </a>
                    </Link>
                    {/* Chevron is automatically added by AccordionTrigger */}
                  </AccordionTrigger>
                </SidebarMenuItem>
                <AccordionContent className="pb-0">
                  <ul className="ml-4 border-l border-sidebar-border/50 pl-2 py-1 space-y-0.5">
                    {item.subItems.map(subItem => renderNavItem(subItem, true))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          }
          return renderNavItem(item);
        })}
      </Accordion>
      {/* Render top-level items directly when sidebar is collapsed */}
      <div className="group-[[data-state=expanded]]:hidden">
        {businessManagementNavItems.map(item => renderNavItem(item))}
      </div>
    </SidebarMenu>
  );
}
