
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, ChevronDown, Settings } from "lucide-react"; // Removed SettingsIcon as Settings is imported
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User as AppUserType } from "@/lib/database";

type UserNavDisplayInfo = Pick<AppUserType, 'name' | 'email'> & { avatarInitial: string };

export function UserNav() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserNavDisplayInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAdminUser() {
      setIsLoading(true);
      if (window.electronAPI && window.electronAPI.getUserByUsername) { // Assuming such a method exists or can be added
        try {
          // This is a simplified approach for demo. In a real app, you'd get the *logged-in* user.
          // For now, let's try to fetch the 'admin' user.
          const adminUser = await window.electronAPI.getUserByUsername("admin");
          if (adminUser) {
            setUserInfo({
              name: adminUser.name || adminUser.username,
              email: adminUser.email || "No email",
              avatarInitial: (adminUser.name || adminUser.username).substring(0, 2).toUpperCase(),
            });
          } else {
            // Fallback if admin user not found or API not fully ready
            setUserInfo({ name: "Admin User", email: "admin@invoiceflow.com", avatarInitial: "AU" });
          }
        } catch (error) {
          console.error("Error fetching admin user for UserNav:", error);
          setUserInfo({ name: "Dunder Mifflin", email: "sales@dundermifflin.com", avatarInitial: "DM" }); // Original fallback
        }
      } else {
        // Fallback if Electron API for users is not available
        setUserInfo({ name: "Dunder Mifflin", email: "sales@dundermifflin.com", avatarInitial: "DM" });
      }
      setIsLoading(false);
    }
    fetchAdminUser();
  }, []);

  const handleLogout = () => {
    // In a real app, clear session/token here
    router.push('/login');
  };

  if (isLoading || !userInfo) {
    return (
      <Button variant="ghost" className="relative h-10 w-10 rounded-full text-foreground hover:bg-accent/20">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-muted text-muted-foreground">...</AvatarFallback>
        </Avatar>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-auto p-1 rounded-full text-foreground hover:bg-accent/10 flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{userInfo.avatarInitial}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden md:inline">{userInfo.name}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:inline" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userInfo.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userInfo.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Settings link removed as per request */}
        {/* <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex items-center cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator /> */}
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
