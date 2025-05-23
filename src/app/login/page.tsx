
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn } from 'lucide-react';
// import { useAuth } from '@/contexts/auth-context'; // Will be used when AuthContext is implemented

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  // const { login } = useAuth(); // Placeholder for actual login function
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (window.electronAPI && window.electronAPI.validateUserCredentials) {
      try {
        const user = await window.electronAPI.validateUserCredentials({ username, password_NOT_Hashed_Yet: password });
        if (user) {
          // TODO: Implement actual session management (e.g., using AuthContext)
          // For now, just show a success toast and redirect
          toast({
            title: "Login Successful",
            description: `Welcome back, ${user.name || user.username}!`,
          });
          router.push('/dashboard'); // Redirect to dashboard or intended page
        } else {
          toast({
            title: "Login Failed",
            description: "Invalid username or password. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Login error:", error);
        toast({
          title: "Login Error",
          description: "An unexpected error occurred during login.",
          variant: "destructive",
        });
      }
    } else {
      // Fallback for non-Electron environment or if API is missing
      // This demo fallback should ideally be removed in a production Electron app
      if (username === 'admin' && password === 'admin123') {
        toast({
          title: "Login Successful (Demo)",
          description: "Welcome back, Admin!",
        });
        router.push('/dashboard');
      } else {
        toast({
          title: "Login Failed (Demo)",
          description: "Invalid username or password.",
          variant: "destructive",
        });
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold">InvoiceFlow Login</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="e.g., admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Default credentials for initial admin: admin / admin123
      </p>
    </div>
  );
}
