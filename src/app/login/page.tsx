
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn, Info, Mail } from 'lucide-react';
import { useAuth } from '@/components/providers';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const resetSchema = z.object({
  email: z.string().email("A valid email is required to send a reset link."),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { login, sendPasswordReset } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  });

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      await login(values.email, values.password);
      toast({ title: "Login Successful", description: "Welcome!" });
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessage = `An unexpected error occurred. Code: ${error.code || 'N/A'}`;
      
      if (error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid credentials. Please check your email and password. New users must be created in the Firebase Console.";
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = "Email/Password sign-in is not enabled. Please enable it in the Firebase console (Authentication > Sign-in method).";
      } else if (error.code === 'auth/user-not-found') { 
        errorMessage = "This user does not exist. Please create an account in the Firebase Console first.";
      }
      
      toast({ title: "Login Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (values: z.infer<typeof resetSchema>) => {
    setIsResetLoading(true);
    try {
      await sendPasswordReset(values.email);
      toast({
        title: "Password Reset Email Sent",
        description: `If an account exists for ${values.email}, a reset link has been sent. Please check your inbox.`,
      });
      setIsResetDialogOpen(false);
      resetForm.reset();
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "Reset Failed",
        description: error.message || "An unknown error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>First-time user?</AlertTitle>
            <AlertDescription>
              User accounts must be created in the Firebase Console before signing in.
            </AlertDescription>
          </Alert>
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <FormField control={loginForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={loginForm.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <div className="flex items-center justify-end text-sm -mt-2">
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto font-normal"
                  onClick={() => setIsResetDialogOpen(true)}
                >
                  Forgot Password?
                </Button>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Sign In
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
        </CardFooter>
      </Card>
      
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address below. We will send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <Form {...resetForm}>
            <form onSubmit={resetForm.handleSubmit(handlePasswordReset)} className="space-y-6 pt-2">
              <FormField
                control={resetForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                 <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsResetDialogOpen(false)}
                  disabled={isResetLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isResetLoading}>
                  {isResetLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  Send Reset Link
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
