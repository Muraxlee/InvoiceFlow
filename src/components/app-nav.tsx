
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
  UsersRound, 
  FileText, 
  Package, 
  BarChart3, 
  Settings as SettingsIcon,
  Users as UsersIcon, // For User Management sub-item
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useState } from 'react';
// import { useAuth } from '@/contexts/auth-context'; // Placeholder for auth context

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  tooltip: string;
  adminOnly?: boolean; // To mark admin-only routes
  subItems?: NavItem[]; // For nested items like User Management under Settings
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
    adminOnly: true, // Example: Settings might be admin only
    subItems: [
      { href: '/settings/users', label: 'User Management', icon: UsersIcon, tooltip: 'Manage Users', adminOnly: true },
      // Add other settings sub-pages here if needed
    ]
  },
];

export function AppNav() {
  const pathname = usePathname();
  // const { user } = useAuth(); // Placeholder for getting user role
  const userRole = 'admin'; // Placeholder: replace with actual user role from auth context

  const [openAccordionItem, setOpenAccordionItem] = useState<string | undefined>(() => {
    // Find if any sub-item is active and open its parent accordion
    const activeParent = businessManagementNavItems.find(item => 
      item.subItems?.some(subItem => pathname.startsWith(subItem.href))
    );
    return activeParent?.href;
  });

  const renderNavItem = (item: NavItem, isSubItem = false) => {
    // Placeholder role check:
    // if (item.adminOnly && userRole !== 'admin') {
    //   return null; // Don't render admin-only items for non-admins
    // }

    const isActive = pathname === item.href || (item.href === "/dashboard" && pathname === "/") || pathname.startsWith(item.href + (item.href === '/settings' ? '/' : ''));
    const isParentActive = item.subItems?.some(sub => pathname.startsWith(sub.href));

    const buttonClass = cn(
      "justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-2.5 pl-3 pr-2 group-[[data-state=collapsed]]:pl-0 group-[[data-state=collapsed]]:justify-center",
      (isActive || (isParentActive && !isSubItem)) && "bg-sidebar-primary text-sidebar-primary-foreground font-medium",
      !isActive && "font-normal",
      isSubItem && "pl-8 text-sm h-9 group-[[data-state=collapsed]]:hidden", // Style for sub-items
      isSubItem && isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
    );

    return (
      <SidebarMenuItem key={item.href} className="relative">
        <Link href={item.href} legacyBehavior passHref>
          <SidebarMenuButton
            isActive={isActive || (isParentActive && !isSubItem)}
            tooltip={{ children: item.tooltip, className: "group-[[data-state=expanded]]:hidden" }}
            aria-label={item.tooltip}
            className={buttonClass}
          >
            {(isActive || (isParentActive && !isSubItem)) && !isSubItem && (
              <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-sm group-[[data-state=collapsed]]:hidden"></span>
            )}
            <item.icon className={cn("h-5 w-5 shrink-0", (isActive || (isParentActive && !isSubItem)) ? (isSubItem ? "text-sidebar-accent-foreground" : "text-sidebar-primary-foreground") : "text-sidebar-foreground/70", isSubItem && "h-4 w-4")} />
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
          // Placeholder role check for parent item visibility
          // if (item.adminOnly && userRole !== 'admin') {
          //   if (!item.subItems?.some(sub => !sub.adminOnly || userRole === 'admin')) return null;
          // }
          
          if (item.subItems && item.subItems.length > 0) {
            return (
              <AccordionItem value={item.href} key={item.href} className="border-none">
                <SidebarMenuItem className="relative mb-0"> {/* AccordionTrigger is inside this */}
                  <AccordionTrigger 
                    className={cn(
                      "justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-2.5 pl-3 pr-2 group-[[data-state=collapsed]]:pl-0 group-[[data-state=collapsed]]:justify-center w-full hover:no-underline",
                      (pathname.startsWith(item.href) || item.subItems.some(sub => pathname.startsWith(sub.href))) && "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    )}
                  >
                    <div className="flex items-center w-full">
                      {(pathname.startsWith(item.href) || item.subItems.some(sub => pathname.startsWith(sub.href))) && (
                         <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-sm group-[[data-state=collapsed]]:hidden"></span>
                      )}
                      <item.icon className={cn("h-5 w-5 shrink-0", (pathname.startsWith(item.href) || item.subItems.some(sub => pathname.startsWith(sub.href))) ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/70")} />
                      <span className="group-[[data-state=collapsed]]:hidden ml-2">{item.label}</span>
                    </div>
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
