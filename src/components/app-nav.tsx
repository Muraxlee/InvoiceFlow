
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
  // Users as UsersIcon, // No longer needed here for sub-item
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useState, useEffect } from 'react';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  tooltip: string;
  adminOnly?: boolean;
  subItems?: NavItem[]; // Optional sub-items
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
    // subItems: [ // Removed User Management sub-item
    //   { href: '/settings/users', label: 'User Management', icon: UsersIcon, tooltip: 'Manage Users', adminOnly: true },
    // ]
  },
];

export function AppNav() {
  const pathname = usePathname();
  // Placeholder for user role logic
  // const userRole = useAuth().user?.role || 'user'; // Example: Assuming useAuth hook

  const [openAccordionItem, setOpenAccordionItem] = useState<string | undefined>(() => {
    // Determine if any accordion item should be open by default
    const activeParent = businessManagementNavItems.find(item =>
      item.subItems?.some(subItem => pathname.startsWith(subItem.href))
    );
    return activeParent?.href;
  });

  useEffect(() => {
    // Update open accordion item if path changes and belongs to a different parent
    const activeParent = businessManagementNavItems.find(item =>
      item.subItems?.some(subItem => pathname.startsWith(subItem.href))
    );
    if (activeParent && openAccordionItem !== activeParent.href) {
      setOpenAccordionItem(activeParent.href);
    } else if (!activeParent && openAccordionItem) {
      // If no parent is active, close any open accordion
      // setOpenAccordionItem(undefined); // Decide if this behavior is desired
    }
  }, [pathname, openAccordionItem]);


  const renderNavItem = (item: NavItem, isSubItem = false) => {
    const isActive = isSubItem 
      ? pathname === item.href
      : (pathname === item.href || (item.href === "/dashboard" && pathname === "/"));
      // For parent items like Settings, we don't need to check startsWith anymore if it has no subItems

    const buttonClass = cn(
      "justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-2.5 pl-3 pr-2 group-[[data-state=collapsed]]:pl-0 group-[[data-state=collapsed]]:justify-center",
      isActive && !isSubItem && "bg-sidebar-primary text-sidebar-primary-foreground font-medium",
      isActive && isSubItem && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
      !isActive && "font-normal",
      isSubItem && "pl-8 text-sm h-9 group-[[data-state=collapsed]]:hidden" // Adjusted for sub-items
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
            {isActive && !isSubItem && (
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
          // If item has subItems and sidebar is expanded, render as AccordionItem
          if (item.subItems && item.subItems.length > 0) {
             const isParentActive = item.subItems.some(subItem => pathname.startsWith(subItem.href));
            return (
              <AccordionItem value={item.href} key={item.href} className="border-none">
                 {/* Main item part of the AccordionTrigger, acts as link if href is main settings page */}
                <SidebarMenuItem className="relative mb-0">
                   <AccordionTrigger
                    className={cn(
                      "flex items-center justify-between w-full text-left", 
                      "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-2.5 pl-3 pr-2 group-[[data-state=collapsed]]:pl-0 group-[[data-state=collapsed]]:justify-center hover:no-underline",
                      isParentActive && !pathname.startsWith(item.href + "/") && "bg-sidebar-primary text-sidebar-primary-foreground font-medium" // Style if parent itself active
                    )}
                  >
                    {/* The Link component now wraps the icon and label for direct navigation */}
                    <Link href={item.href} className="flex items-center flex-grow mr-2">
                       {isParentActive && !pathname.startsWith(item.href + "/") && ( // Active indicator for parent link
                           <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-sm group-[[data-state=collapsed]]:hidden"></span>
                        )}
                      <item.icon className={cn("h-5 w-5 shrink-0", isParentActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/70")} />
                      <span className="group-[[data-state=collapsed]]:hidden ml-2">{item.label}</span>
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
          // If item has no subItems, render as a direct link
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
