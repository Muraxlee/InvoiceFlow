"use client";

import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, DatabaseZap, UsersRound, Brain, Sparkles, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();

  const handleDataAction = (actionName: string) => {
    // Placeholder for actual data clearing logic
    console.log(`${actionName} initiated`);
    toast({
      title: `${actionName} Successful`,
      description: `The ${actionName.toLowerCase()} operation has been completed. (This is a placeholder)`,
    });
  };

  const dataManagementActions = [
    { id: "clearSales", label: "Clear Sales Data", description: "Permanently delete all sales records and reports. This action cannot be undone." },
    { id: "clearCustomers", label: "Clear Customer Data", description: "Permanently delete all customer information. This action cannot be undone." },
    { id: "clearProducts", label: "Clear Product Data", description: "Permanently delete all product information. This action cannot be undone." },
    { id: "factoryReset", label: "Factory Reset", description: "Reset all application data and settings to their default state. This will erase everything. This action cannot be undone." },
  ];


  return (
    <div className="space-y-8">
      <PageHeader title="Application Settings" description="Manage your application data, user roles, and other configurations." />

      <Card className="shadow-lg border-destructive">
        <CardHeader>
          <div className="flex items-center gap-3">
            <DatabaseZap className="h-8 w-8 text-destructive" />
            <div>
              <CardTitle className="text-xl">Data Management</CardTitle>
              <CardDescription className="text-destructive flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" /> Warning: These actions are irreversible and will result in permanent data loss.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {dataManagementActions.map(action => (
             <div key={action.id} className="rounded-md border border-border p-4 shadow-sm bg-card hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-lg mb-1">{action.label}</h3>
              <p className="text-sm text-muted-foreground mb-3">{action.description}</p>
              <ConfirmDialog
                triggerButton={
                  <Button variant="destructive" className="w-full sm:w-auto">
                    <Trash2 className="mr-2 h-4 w-4" /> {action.label}
                  </Button>
                }
                title={`Confirm ${action.label}`}
                description={`Are you absolutely sure you want to ${action.label.toLowerCase()}? This action cannot be undone.`}
                onConfirm={() => handleDataAction(action.label)}
                confirmText="Yes, Proceed"
                confirmVariant="destructive"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <UsersRound className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-xl">Role Management</CardTitle>
              <CardDescription>Define user roles and permissions for access control.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Role management features are currently under development. This section will allow administrators to create, assign, and manage user roles and their respective permissions within InvoiceFlow.
          </p>
          {/* Placeholder for role management UI */}
          <div className="mt-4 p-6 border-2 border-dashed border-border rounded-md text-center">
            <UsersRound className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">User role management interface will be available here soon.</p>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid md:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Brain className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-xl">AI Settings</CardTitle>
                <CardDescription>Configure AI-powered features like GST suggestions.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Manage settings related to AI-driven functionalities. Currently, GST suggestions are active. Future options for tuning AI behavior or enabling/disabling specific AI features will appear here.
            </p>
            {/* Placeholder for AI settings UI */}
            <div className="mt-4 p-6 border-2 border-dashed border-border rounded-md text-center">
              <Brain className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">AI configuration options will be available here.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-xl">Sales Enhancement Suggestions</CardTitle>
                <CardDescription>Get AI-powered suggestions to improve your sales strategies.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This feature is planned for a future update. It will provide actionable insights and suggestions based on your sales data to help you enhance performance and identify new opportunities.
            </p>
             {/* Placeholder for Sales Enhancement UI */}
            <div className="mt-4 p-6 border-2 border-dashed border-border rounded-md text-center">
              <Sparkles className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Sales enhancement suggestions will appear here.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
