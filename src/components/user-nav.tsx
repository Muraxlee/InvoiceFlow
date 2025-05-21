
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
import { LogOut, User, Settings as SettingsIcon, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function UserNav() {
  const [user, setUser] = useState<{ name: string; email: string; avatarInitial: string } | null>(null);

  useEffect(() => {
    setUser({ 
      name: "Dunder Mifflin", // Updated to match image
      email: "sales@dundermifflin.com", // Example email
      avatarInitial: "DM" 
    });
  }, []);

  if (!user) {
    return (
      <Button variant="ghost" className="relative h-10 w-10 rounded-full text-foreground hover:bg-accent/20">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-muted text-muted-foreground">?</AvatarFallback>
        </Avatar>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-auto p-1 rounded-full text-foreground hover:bg-accent/10 flex items-center gap-2">
          <Avatar className="h-8 w-8">
            {/* Using a simple colored fallback as placeholder images might not fit dark theme well */}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{user.avatarInitial}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden md:inline">{user.name}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:inline" />
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
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
