
"use client";

import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function UserManagementSettings() {
  const { appUser, loading } = useAuth();

  if (loading) {
     return (
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!appUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No user is currently logged in.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>
            This is your current user information. Full user management for admins can be built out using Firebase Cloud Functions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-1.5">
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-medium">{appUser.name || 'Not set'}</p>
          </div>
          <div className="flex flex-col space-y-1.5">
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{appUser.email}</p>
          </div>
          <div className="flex flex-col space-y-1.5">
            <p className="text-sm text-muted-foreground">Role</p>
            <p className="font-medium">
              <Badge variant={appUser.role === "admin" ? "default" : "secondary"}>
                {appUser.role.charAt(0).toUpperCase() + appUser.role.slice(1)}
              </Badge>
            </p>
          </div>
          <div className="flex flex-col space-y-1.5">
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium">
              <Badge variant={appUser.isActive ? "success" : "destructive"}>
                {appUser.isActive ? "Active" : "Inactive"}
              </Badge>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
