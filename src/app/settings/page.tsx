
"use client";

import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, DatabaseZap, UsersRound, Trash2, Settings2 as SettingsIcon, Save, Palette, Building, FileCog, ShieldCheck, Edit3, Download, Upload, Archive, Type, FileJson, Info, Database, FolderInput, Loader2 } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { loadFromLocalStorage, saveToLocalStorage, INVOICE_CONFIG_KEY, DEFAULT_INVOICE_PREFIX, type InvoiceConfig, COMPANY_NAME_STORAGE_KEY, DEFAULT_COMPANY_NAME, CUSTOM_THEME_STORAGE_KEY, type CustomThemeValues, DEFAULT_CUSTOM_THEME_VALUES, LAST_BACKUP_TIMESTAMP_KEY } from "@/lib/localStorage";

import { THEME_STORAGE_KEY, AVAILABLE_THEMES, DEFAULT_THEME_KEY } from "@/components/providers"; 
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Link from "next/link";
import { format } from "date-fns"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import FontSettings from "@/components/font-settings";
import { CompanySettingsForm } from "@/components/company-settings-form";
import type { CompanyInfo } from "@/types/database";
import { getCompanyInfo as getDbCompanyInfo, clearAllCustomers, clearAllProducts, clearAllData, seedSampleData, clearAllInvoices, clearAllMeasurements } from "@/lib/firestore-actions"; 
import UserManagementSettings from "./user-management-settings";
import MeasurementSettings from "@/components/measurement-settings";

const initialCompanyInfo: CompanyInfo = {
  name: '', address: '', phone: '', phone2: '', email: '', gstin: '',
  bank_account_name: '', bank_name: '', bank_account: '', bank_ifsc: ''
};

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [invoicePrefix, setInvoicePrefix] = useState(DEFAULT_INVOICE_PREFIX);
  const [originalInvoicePrefix, setOriginalInvoicePrefix] = useState(DEFAULT_INVOICE_PREFIX);
  const [selectedThemeKey, setSelectedThemeKey] = useState<string>(DEFAULT_THEME_KEY);
  const [companyNameInput, setCompanyNameInput] = useState(DEFAULT_COMPANY_NAME); 
  const [currentCompanyName, setCurrentCompanyName] = useState(DEFAULT_COMPANY_NAME); 
  const [exampleInvoiceDateString, setExampleInvoiceDateString] = useState(""); 
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);


  const [customThemeValues, setCustomThemeValues] = useState<CustomThemeValues>(DEFAULT_CUSTOM_THEME_VALUES);
  const [originalCustomThemeValues, setOriginalCustomThemeValues] = useState<CustomThemeValues>(DEFAULT_CUSTOM_THEME_VALUES);
  
  const [lastSettingsBackupTimestamp, setLastSettingsBackupTimestamp] = useState<number | null>(null);

  useEffect(() => {
    const config = loadFromLocalStorage<InvoiceConfig>(INVOICE_CONFIG_KEY, { 
      prefix: DEFAULT_INVOICE_PREFIX, 
      dailyCounters: {} 
    });
    setInvoicePrefix(config.prefix);
    setOriginalInvoicePrefix(config.prefix);

    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME_KEY;
    setSelectedThemeKey(storedTheme);

    const storedAppTitleCompanyName = loadFromLocalStorage<string>(COMPANY_NAME_STORAGE_KEY, DEFAULT_COMPANY_NAME);
    setCompanyNameInput(storedAppTitleCompanyName);
    setCurrentCompanyName(storedAppTitleCompanyName);
    
    const storedCustomTheme = loadFromLocalStorage<CustomThemeValues>(CUSTOM_THEME_STORAGE_KEY, DEFAULT_CUSTOM_THEME_VALUES);
    setCustomThemeValues(storedCustomTheme);
    setOriginalCustomThemeValues(storedCustomTheme);

    const storedBackupTimestamp = loadFromLocalStorage<number | null>(LAST_BACKUP_TIMESTAMP_KEY, null);
    setLastSettingsBackupTimestamp(storedBackupTimestamp);
    
    if (typeof window !== 'undefined') { 
        setExampleInvoiceDateString(format(new Date(), 'ddMMyyyy'));
    }

    const loadCompanyInfoFromDb = async () => {
      try {
        const info = await getDbCompanyInfo();
        setCompanyInfo(info || initialCompanyInfo);
      } catch (error) {
        console.error('Failed to load company info from DB:', error);
        setCompanyInfo(initialCompanyInfo);
      }
    };
    loadCompanyInfoFromDb();

  }, []);

  const { mutate: seedMutation, isPending: isSeeding } = useMutation({
    mutationFn: seedSampleData,
    onSuccess: () => {
        toast({
            title: "Sample Data Seeded",
            description: "Sample customers, products, and an invoice have been added."
        });
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
        queryClient.invalidateQueries({ queryKey: ['reportData'] });
    },
    onError: (error: any) => {
        toast({
            title: "Error Seeding Data",
            description: error.message || "An unknown error occurred.",
            variant: "destructive"
        });
    }
  });

  const handleSeedData = () => {
      seedMutation();
  };
  
  const { mutate: dataClearMutation, isPending: isDataClearing } = useMutation({
    mutationFn: async (dataType: 'customers' | 'products' | 'invoices' | 'measurements' | 'allData' | 'settings') => {
      switch (dataType) {
        case 'customers': return clearAllCustomers();
        case 'products': return clearAllProducts();
        case 'invoices': return clearAllInvoices();
        case 'measurements': return clearAllMeasurements();
        case 'allData': return clearAllData();
        case 'settings':
            const keysToClear = [
                COMPANY_NAME_STORAGE_KEY, INVOICE_CONFIG_KEY, 
                THEME_STORAGE_KEY, CUSTOM_THEME_STORAGE_KEY, LAST_BACKUP_TIMESTAMP_KEY,
            ];
            keysToClear.forEach(key => localStorage.removeItem(key));
            return Promise.resolve();
        default: throw new Error("Invalid data type for clearing.");
      }
    },
    onSuccess: (_, dataType) => {
      let requiresReload = false;
      const actionName = {
        customers: "Clear Customer Data",
        products: "Clear Product Data",
        invoices: "Clear Invoice Data",
        measurements: "Clear Measurement Data",
        allData: "Factory Reset",
        settings: "Settings Reset",
      }[dataType];

      toast({
        title: `${actionName} Successful`,
        description: `The operation has been completed.`,
      });

      // Invalidate relevant queries
      if (dataType === 'customers' || dataType === 'allData') queryClient.invalidateQueries({ queryKey: ['customers'] });
      if (dataType === 'products' || dataType === 'allData') queryClient.invalidateQueries({ queryKey: ['products'] });
      if (dataType === 'invoices' || dataType === 'allData') queryClient.invalidateQueries({ queryKey: ['invoices'] });
      if (dataType === 'measurements' || dataType === 'allData') queryClient.invalidateQueries({ queryKey: ['measurements'] });
      if (dataType === 'allData') queryClient.invalidateQueries({ queryKey: ['companyInfo'] });

      // If settings are reset, or all data is cleared, reload the page
      if (dataType === 'settings' || dataType === 'allData') {
        setTimeout(() => window.location.reload(), 1500);
      }
    },
    onError: (error: any, dataType) => {
      toast({
        title: "Error",
        description: `Failed to clear ${dataType} data: ${error.message}`,
        variant: "destructive"
      });
    },
  });

  const handleSaveInvoiceSettings = () => {
    const currentConfig = loadFromLocalStorage<InvoiceConfig>(INVOICE_CONFIG_KEY, { prefix: DEFAULT_INVOICE_PREFIX, dailyCounters: {} });
    let newPrefix = invoicePrefix.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
    if (newPrefix.length === 0 && invoicePrefix.length > 0) {
        toast({title: "Invalid Prefix", description: "Invoice prefix must contain letters and be 3 characters long.", variant: "destructive"});
        setInvoicePrefix(originalInvoicePrefix); return;
    }
    if (newPrefix.length === 0 && invoicePrefix.length === 0) newPrefix = DEFAULT_INVOICE_PREFIX;
    else if (newPrefix.length < 3) {
       toast({title: "Prefix Too Short", description: "Invoice prefix must be 3 letters.", variant: "destructive"});
       setInvoicePrefix(originalInvoicePrefix); return;
    }
    currentConfig.prefix = newPrefix; 
    saveToLocalStorage(INVOICE_CONFIG_KEY, currentConfig);
    setInvoicePrefix(currentConfig.prefix); setOriginalInvoicePrefix(currentConfig.prefix);
    toast({ title: "Invoice Settings Saved", description: `Invoice prefix updated to ${currentConfig.prefix}.`});
  };
  
  const handleSaveAppTitle = () => {
    if (!companyNameInput.trim()) {
      toast({ title: "Application Title Empty", description: "Please enter an application title.", variant: "destructive"}); return;
    }
    saveToLocalStorage(COMPANY_NAME_STORAGE_KEY, companyNameInput);
    setCurrentCompanyName(companyNameInput);
    if (document) document.title = companyNameInput;
    window.dispatchEvent(new StorageEvent('storage', { key: COMPANY_NAME_STORAGE_KEY, newValue: JSON.stringify(companyNameInput) }));
    toast({ title: "Application Title Saved", description: `Application title updated to ${companyNameInput}.`});
  };

  const handleThemeChange = useCallback((themeKey: string) => {
    if (AVAILABLE_THEMES[themeKey as keyof typeof AVAILABLE_THEMES]) {
      const htmlElement = document.documentElement;
      htmlElement.setAttribute('data-theme', themeKey); 
      localStorage.setItem(THEME_STORAGE_KEY, themeKey); setSelectedThemeKey(themeKey);
      if (themeKey === 'custom') {
          const storedCustomTheme = loadFromLocalStorage<CustomThemeValues>(CUSTOM_THEME_STORAGE_KEY, DEFAULT_CUSTOM_THEME_VALUES);
          const root = document.documentElement;
          if (storedCustomTheme.background) root.style.setProperty('--background', storedCustomTheme.background); else root.style.removeProperty('--background');
          if (storedCustomTheme.foreground) root.style.setProperty('--foreground', storedCustomTheme.foreground); else root.style.removeProperty('--foreground');
          if (storedCustomTheme.primary) root.style.setProperty('--primary', storedCustomTheme.primary); else root.style.removeProperty('--primary');
      } else { 
          const root = document.documentElement;
          root.style.removeProperty('--background'); root.style.removeProperty('--foreground'); root.style.removeProperty('--primary');
      }
      toast({ title: "Theme Updated", description: `Theme changed to ${AVAILABLE_THEMES[themeKey as keyof typeof AVAILABLE_THEMES]}.`});
    }
  }, [toast]); 

  const handleSaveCustomTheme = () => {
    saveToLocalStorage(CUSTOM_THEME_STORAGE_KEY, customThemeValues); setOriginalCustomThemeValues(customThemeValues);
    toast({ title: "Custom Theme Saved", description: "Your custom theme values have been saved."});
    if (selectedThemeKey === 'custom') window.dispatchEvent(new StorageEvent('storage', { key: CUSTOM_THEME_STORAGE_KEY, newValue: JSON.stringify(customThemeValues) }));
  };

  const dataManagementActions = [
    { id: "clearCustomers", label: "Clear Customer Data", description: "Permanently delete all customer information from the database.", dataType: 'customers' as const },
    { id: "clearProducts", label: "Clear Product Data", description: "Permanently delete all product information from the database.", dataType: 'products' as const },
    { id: "factoryReset", label: "Factory Reset Application", description: "Reset all database data and clear local storage settings. Requires app restart.", dataType: 'allData' as const },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Application Settings" 
        description="Configure various aspects of the application." 
      />

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="w-full grid grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="company" className="flex items-center gap-2"><Building className="h-4 w-4" /><span className="hidden sm:inline">Company</span></TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2"><Palette className="h-4 w-4" /><span className="hidden sm:inline">Appearance</span></TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2"><FileCog className="h-4 w-4" /><span className="hidden sm:inline">Modules</span></TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2"><DatabaseZap className="h-4 w-4" /><span className="hidden sm:inline">Data</span></TabsTrigger>
        </TabsList>
        
        <TabsContent value="company" className="space-y-6">
         {companyInfo ? (
            <CompanySettingsForm 
              defaultValues={companyInfo} 
              onSuccess={async () => {
                const info = await getDbCompanyInfo();
                setCompanyInfo(info || initialCompanyInfo); 
                if (info?.name) {
                    saveToLocalStorage(COMPANY_NAME_STORAGE_KEY, info.name);
                    setCurrentCompanyName(info.name); setCompanyNameInput(info.name);
                    if (document) document.title = info.name;
                    window.dispatchEvent(new StorageEvent('storage', { key: COMPANY_NAME_STORAGE_KEY, newValue: JSON.stringify(info.name) }));
                }
              }} 
            />
         ) : (
            <Card><CardContent className="pt-6"><div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin"/></div></CardContent></Card>
         )}
          <Card>
            <CardHeader><CardTitle>Application Title</CardTitle><CardDescription>Set the title displayed in the browser tab/application window (stored locally).</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="appTitle">Application Title</Label>
                <div className="flex w-full max-w-md items-center gap-2">
                  <Input id="appTitle" placeholder="Enter application title" value={companyNameInput} onChange={(e) => setCompanyNameInput(e.target.value)} className="flex-1"/>
                  <Button onClick={handleSaveAppTitle} size="sm" disabled={companyNameInput === currentCompanyName || !companyNameInput.trim()}><Save className="mr-2 h-4 w-4" /> Save</Button>
                </div>
                <p className="text-sm text-muted-foreground">Current: <span className="font-medium">{currentCompanyName}</span></p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="w-full">
              <CardHeader><CardTitle>Theme Settings</CardTitle><CardDescription>Customize the look and feel.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={selectedThemeKey} onValueChange={handleThemeChange} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(AVAILABLE_THEMES).map(([key, name]) => (
                    <div key={key}>
                      <RadioGroupItem value={key} id={`theme-${key}`} className="peer sr-only"/>
                      <Label 
                        htmlFor={`theme-${key}`} 
                        className={cn(
                          "flex flex-col items-center justify-center rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer h-28 text-center", 
                          selectedThemeKey === key ? "border-primary ring-2 ring-primary" : "border-muted"
                        )}
                      >
                        <div className="mb-2 h-5 w-5 rounded-full border" style={{background: key === 'custom' ? (customThemeValues.primary ? `hsl(${customThemeValues.primary})` : 'var(--sidebar-primary, var(--primary))') : `var(--sidebar-primary, var(--primary))`}} data-theme-preview={key} />
                        <div className="font-medium text-xs leading-tight">{name}</div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {selectedThemeKey === 'custom' && (
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium">Custom Theme Configuration</h4>
                    <div className="grid gap-2"><Label htmlFor="bg-color">Background Color (HSL)</Label><Input id="bg-color" placeholder="e.g., 220 15% 15%" value={customThemeValues.background || ''} onChange={(e) => setCustomThemeValues(prev => ({ ...prev, background: e.target.value }))}/></div>
                    <div className="grid gap-2"><Label htmlFor="fg-color">Foreground Color (HSL)</Label><Input id="fg-color" placeholder="e.g., 220 10% 85%" value={customThemeValues.foreground || ''} onChange={(e) => setCustomThemeValues(prev => ({ ...prev, foreground: e.target.value }))}/></div>
                    <div className="grid gap-2"><Label htmlFor="primary-color">Primary Accent (HSL)</Label><Input id="primary-color" placeholder="e.g., 180 60% 45%" value={customThemeValues.primary || ''} onChange={(e) => setCustomThemeValues(prev => ({ ...prev, primary: e.target.value }))}/>
                      <p className="text-xs text-muted-foreground">Format: H S% L% (e.g. 260 25% 7%)</p>
                    </div>
                    <Button onClick={handleSaveCustomTheme} className="w-full mt-2" disabled={JSON.stringify(customThemeValues) === JSON.stringify(originalCustomThemeValues)}><Save className="w-4 h-4 mr-2" />Save Custom Theme</Button>
                  </div>
                )}
              </CardContent>
            </Card>
            <FontSettings />
          </div>
        </TabsContent>

        <TabsContent value="modules" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Invoice Settings</CardTitle><CardDescription>Configure invoice numbering (stored locally).</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invoicePrefix">Invoice Prefix (3 uppercase letters)</Label>
                <div className="flex gap-2 items-center flex-wrap">
                    <Input id="invoicePrefix" value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase().substring(0,3))} maxLength={3} className="max-w-[100px] flex-grow sm:flex-grow-0" placeholder="e.g. INV"/>
                    <Button onClick={handleSaveInvoiceSettings} disabled={invoicePrefix === originalInvoicePrefix && invoicePrefix.length === 3}><Save className="mr-2 h-4 w-4" /> Save Prefix</Button>
                </div>
                {exampleInvoiceDateString && <p className="text-xs text-muted-foreground">Example: {(invoicePrefix || 'INV').padEnd(3,'X')}{exampleInvoiceDateString}0001</p>}
              </div>
            </CardContent>
          </Card>
           <MeasurementSettings />
        </TabsContent>
        
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Seed Sample Data</CardTitle>
              <CardDescription>
                Populate your database with a sample customer, product, and invoice to explore the app's features. This is safe to run multiple times.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleSeedData} disabled={isSeeding || isDataClearing}>
                {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                Load Sample Data
              </Button>
            </CardContent>
          </Card>
          <Card className="border-destructive">
            <CardHeader><CardTitle>Data Clearing Options</CardTitle><CardDescription className="text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Warning: These actions are irreversible.</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {dataManagementActions.map(action => (
                <div key={action.id} className="rounded-md border border-border p-4 shadow-sm bg-card hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-lg mb-1">{action.label}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{action.description}</p>
                  <ConfirmDialog
                    triggerButton={<Button variant="destructive" className="w-full sm:w-auto" disabled={isDataClearing}><Trash2 className="mr-2 h-4 w-4" /> {action.label.replace(/\s\(.*\)/, '')}</Button>}
                    title={`Confirm ${action.label}`}
                    description={`Are you sure? This cannot be undone.`}
                    onConfirm={() => dataClearMutation(action.dataType)}
                    confirmText="Yes, Proceed" confirmVariant="destructive"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
