
"use client";

import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, DatabaseZap, UsersRound, Brain, Sparkles, Trash2, Settings2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { loadFromLocalStorage, saveToLocalStorage, INVOICE_CONFIG_KEY, DEFAULT_INVOICE_PREFIX, type InvoiceConfig } from "@/lib/localStorage";

const CUSTOMERS_KEY = "app_customers";
const PRODUCTS_KEY = "app_products";
const INVOICES_KEY = "app_invoices";


export default function SettingsPage() {
  const { toast } = useToast();
  const [invoicePrefix, setInvoicePrefix] = useState(DEFAULT_INVOICE_PREFIX);
  const [originalInvoicePrefix, setOriginalInvoicePrefix] = useState(DEFAULT_INVOICE_PREFIX);


  useEffect(() => {
    const config = loadFromLocalStorage<InvoiceConfig>(INVOICE_CONFIG_KEY, { 
      prefix: DEFAULT_INVOICE_PREFIX, 
      dailyCounters: {} 
    });
    setInvoicePrefix(config.prefix);
    setOriginalInvoicePrefix(config.prefix);
  }, []);

  const handleDataAction = (actionName: string, storageKey?: string | string[]) => {
    if (typeof window !== 'undefined') {
      if (storageKey) {
        if (Array.isArray(storageKey)) {
          storageKey.forEach(key => localStorage.removeItem(key));
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    }
    console.log(`${actionName} initiated`);
    toast({
      title: `${actionName} Successful`,
      description: `The ${actionName.toLowerCase()} operation has been completed. Data cleared from local storage.`,
    });
  };

  const handleSaveInvoiceSettings = () => {
    const currentConfig = loadFromLocalStorage<InvoiceConfig>(INVOICE_CONFIG_KEY, {
      prefix: DEFAULT_INVOICE_PREFIX,
      dailyCounters: {},
    });
    
    const newPrefix = invoicePrefix.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
    
    if (newPrefix.length === 0) {
        toast({title: "Invalid Prefix", description: "Invoice prefix cannot be empty and must contain letters.", variant: "destructive"});
        setInvoicePrefix(currentConfig.prefix); // Reset to current valid prefix
        return;
    }
     if (newPrefix.length < 3 && invoicePrefix.length > 0) { // Allow user to type, but enforce on save
      toast({title: "Prefix Too Short", description: "Invoice prefix should ideally be 3 letters.", variant: "destructive"});
       setInvoicePrefix(currentConfig.prefix); // Reset to current valid prefix
      return;
    }


    currentConfig.prefix = newPrefix.padEnd(3, 'X'); // Pad if less than 3 letters, though previous check should handle it

    saveToLocalStorage(INVOICE_CONFIG_KEY, currentConfig);
    setInvoicePrefix(currentConfig.prefix); // Update state to reflect sanitized prefix
    setOriginalInvoicePrefix(currentConfig.prefix);
    toast({
      title: "Invoice Settings Saved",
      description: `Invoice prefix updated to ${currentConfig.prefix}.`,
    });
  };


  const dataManagementActions = [
    { id: "clearSales", label: "Clear Sales Data (Invoices)", description: "Permanently delete all sales records (invoices) from local storage. This action cannot be undone.", key: INVOICES_KEY },
    { id: "clearCustomers", label: "Clear Customer Data", description: "Permanently delete all customer information from local storage. This action cannot be undone.", key: CUSTOMERS_KEY },
    { id: "clearProducts", label: "Clear Product Data", description: "Permanently delete all product information from local storage. This action cannot be undone.", key: PRODUCTS_KEY },
    { id: "factoryReset", label: "Factory Reset", description: "Reset all application data (invoices, customers, products) and settings to their default state from local storage. This will erase everything. This action cannot be undone.", key: [INVOICES_KEY, CUSTOMERS_KEY, PRODUCTS_KEY, INVOICE_CONFIG_KEY] },
  ];


  return (
    <div className="space-y-8">
      <PageHeader title="Application Settings" description="Manage your application data, user roles, and other configurations." />

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Settings2 className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-xl">Invoice Settings</CardTitle>
              <CardDescription>Configure invoice numbering and other related settings.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoicePrefix">Invoice Prefix (3 uppercase letters)</Label>
            <div className="flex gap-2 items-center">
                <Input 
                    id="invoicePrefix" 
                    value={invoicePrefix} 
                    onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase().substring(0,3))}
                    maxLength={3}
                    className="max-w-xs"
                    placeholder="e.g. INV"
                />
                <Button onClick={handleSaveInvoiceSettings} disabled={invoicePrefix === originalInvoicePrefix && invoicePrefix.length === 3}>
                    <Save className="mr-2 h-4 w-4" /> Save Prefix
                </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Example: If prefix is 'INV', date is 22/05/2025, and it's the 1st invoice of the day, number will be INV220520250001.
            </p>
          </div>
        </CardContent>
      </Card>


      <Card className="shadow-lg border-destructive">
        <CardHeader>
          <div className="flex items-center gap-3">
            <DatabaseZap className="h-8 w-8 text-destructive" />
            <div>
              <CardTitle className="text-xl">Data Management (Local Storage)</CardTitle>
              <CardDescription className="text-destructive flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" /> Warning: These actions are irreversible and will result in permanent data loss from your browser's local storage.
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
                onConfirm={() => handleDataAction(action.label, action.key)}
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
