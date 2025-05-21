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
import { LogOut, User, Settings as SettingsIcon } from "lucide-react"; // Renamed to avoid conflict
import Link from "next/link";
import { useEffect, useState } from "react";

export function UserNav() {
  // Placeholder for user data. In a real app, this would come from auth state.
  const [user, setUser] = useState<{ name: string; email: string; avatarInitial: string } | null>(null);

  useEffect(() => {
    // Simulate fetching user data
    setUser({ 
      name: "Admin User", 
      email: "admin@invoiceflow.com",
      avatarInitial: "AU" 
    });
  }, []);

  if (!user) {
    return (
      <Button variant="ghost" className="relative h-10 w-10 rounded-full">
        <Avatar className="h-9 w-9">
          <AvatarFallback>?</AvatarFallback>
        </Avatar>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={`https://placehold.co/100x100.png?text=${user.avatarInitial}`} alt={user.name} data-ai-hint="user avatar" />
            <AvatarFallback>{user.avatarInitial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex items-center cursor-pointer">
              <SettingsIcon className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
          {/* Add logout functionality here, e.g., onClick={() => signOut()} */}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
