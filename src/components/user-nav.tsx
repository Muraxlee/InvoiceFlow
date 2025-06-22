
"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers";

export function UserNav() {
  const { appUser, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      // The auth provider will handle redirecting to /login via the layout logic
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const displayName = appUser?.name || appUser?.email?.split('@')[0] || "User";
  const avatarInitial = (displayName).substring(0, 2).toUpperCase();

  if (!appUser) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-auto p-1 rounded-full text-foreground hover:bg-accent/10 flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{avatarInitial}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden md:inline">{displayName}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:inline" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            {appUser.email && (
              <p className="text-xs leading-none text-muted-foreground">
                {appUser.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
