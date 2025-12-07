
"use client";

import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, DatabaseZap, UsersRound, Trash2, Settings2 as SettingsIcon, Save, Palette, Building, FileCog, ShieldCheck, Edit3, Download, Upload, Archive, Type, FileJson, Info, Database, FolderInput, Loader2, HelpCircle } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { loadFromLocalStorage, saveToLocalStorage, INVOICE_CONFIG_KEY, DEFAULT_INVOICE_PREFIX, type InvoiceConfig, COMPANY_NAME_STORAGE_KEY, DEFAULT_COMPANY_NAME, CUSTOM_THEME_STORAGE_KEY, type CustomThemeValues, DEFAULT_CUSTOM_THEME_VALUES, LAST_BACKUP_TIMESTAMP_KEY, DEFAULT_PROFORMA_PREFIX, DEFAULT_QUOTATION_PREFIX } from "@/lib/localStorage";

import { THEME_STORAGE_KEY, AVAILABLE_THEMES, DEFAULT_THEME_KEY } from "@/components/providers"; 
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Link from "next/link";
import { format } from "date-fns"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import FontSettings from "@/components/font-settings";
import { CompanySettingsForm } from "@/components/company-settings-form";
import type { CompanyData } from "@/types/database";
import { getCompanyInfo as getDbCompanyInfo, clearAllCustomers, clearAllProducts, clearAllData, seedSampleData, clearAllInvoices, clearAllMeasurements, clearAllPurchases, saveCompanyInfo } from "@/lib/firestore-actions"; 
import UserManagementSettings from "./user-management-settings";
import MeasurementSettings from "@/components/measurement-settings";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


const initialCompanyInfo: CompanyData = {
  id: 'main',
  name: '', address: '', phone: '', phone2: '', email: '', gstin: '',
  bank_account_name: '', bank_name: '', bank_account: '', bank_ifsc: '',
  invoicePrefix: DEFAULT_INVOICE_PREFIX,
  proformaPrefix: DEFAULT_PROFORMA_PREFIX,
  quotationPrefix: DEFAULT_QUOTATION_PREFIX,
  includeDateInNumber: true,
};

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedThemeKey, setSelectedThemeKey] = useState<string>(DEFAULT_THEME_KEY);
  const [customThemeValues, setCustomThemeValues] = useState<CustomThemeValues>(DEFAULT_CUSTOM_THEME_VALUES);
  const [originalCustomThemeValues, setOriginalCustomThemeValues] = useState<CustomThemeValues>(DEFAULT_CUSTOM_THEME_VALUES);
  const [lastSettingsBackupTimestamp, setLastSettingsBackupTimestamp] = useState<number | null>(null);

  const { data: companyInfo, isLoading: isLoadingCompanyInfo, refetch: refetchCompanyInfo } = useQuery<CompanyData | null>({
      queryKey: ['companyInfo'],
      queryFn: getDbCompanyInfo,
  });

  const saveCompanyMutation = useMutation({
    mutationFn: saveCompanyInfo,
    onSuccess: () => {
      toast({ title: 'Settings Saved', description: 'Your changes have been saved to the cloud.' });
      queryClient.invalidateQueries({ queryKey: ['companyInfo'] });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' });
    }
  });

  const [invoicePrefix, setInvoicePrefix] = useState(DEFAULT_INVOICE_PREFIX);
  const [proformaPrefix, setProformaPrefix] = useState(DEFAULT_PROFORMA_PREFIX);
  const [quotationPrefix, setQuotationPrefix] = useState(DEFAULT_QUOTATION_PREFIX);
  const [includeDate, setIncludeDate] = useState(true);
  const [exampleInvoiceDateString, setExampleInvoiceDateString] = useState(""); 
  
  useEffect(() => {
    if (companyInfo) {
      setInvoicePrefix(companyInfo.invoicePrefix || DEFAULT_INVOICE_PREFIX);
      setProformaPrefix(companyInfo.proformaPrefix || DEFAULT_PROFORMA_PREFIX);
      setQuotationPrefix(companyInfo.quotationPrefix || DEFAULT_QUOTATION_PREFIX);
      setIncludeDate(companyInfo.includeDateInNumber === false ? false : true);
    }
  }, [companyInfo]);

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME_KEY;
    setSelectedThemeKey(storedTheme);
    const storedCustomTheme = loadFromLocalStorage<CustomThemeValues>(CUSTOM_THEME_STORAGE_KEY, DEFAULT_CUSTOM_THEME_VALUES);
    setCustomThemeValues(storedCustomTheme);
    setOriginalCustomThemeValues(storedCustomTheme);
    const storedBackupTimestamp = loadFromLocalStorage<number | null>(LAST_BACKUP_TIMESTAMP_KEY, null);
    setLastSettingsBackupTimestamp(storedBackupTimestamp);
    
    if (typeof window !== 'undefined') { 
        setExampleInvoiceDateString(format(new Date(), 'ddMMyyyy'));
    }
  }, []);

  const { mutate: seedMutation, isPending: isSeeding } = useMutation({
    mutationFn: seedSampleData,
    onSuccess: () => {
        toast({ title: "Sample Data Seeded", description: "Sample customers, products, and an invoice have been added." });
        queryClient.invalidateQueries();
    },
    onError: (error: any) => { toast({ title: "Error Seeding Data", description: error.message || "An unknown error occurred.", variant: "destructive" }); }
  });

  const { mutate: dataClearMutation, isPending: isDataClearing } = useMutation({
    mutationFn: async (dataType: 'customers' | 'products' | 'invoices' | 'measurements' | 'allData' | 'settings' | 'purchases') => {
      switch (dataType) {
        case 'customers': return clearAllCustomers();
        case 'products': return clearAllProducts();
        case 'invoices': return clearAllInvoices();
        case 'measurements': return clearAllMeasurements();
        case 'purchases': return clearAllPurchases();
        case 'allData': return clearAllData();
        case 'settings':
            localStorage.clear();
            return await saveCompanyInfo(initialCompanyInfo);
        default: throw new Error("Invalid data type for clearing.");
      }
    },
    onSuccess: (_, dataType) => {
      const actionName = {
        customers: "Clear Customer Data", products: "Clear Product Data", invoices: "Clear Invoice Data",
        measurements: "Clear Measurement Data", purchases: "Clear Purchase Data",
        allData: "Factory Reset", settings: "Settings Reset",
      }[dataType];
      toast({ title: `${actionName} Successful`, description: `The operation has been completed.` });
      
      if (dataType === 'settings' || dataType === 'allData') {
        setTimeout(() => window.location.reload(), 1500);
      } else {
        queryClient.invalidateQueries();
      }
    },
    onError: (error: any, dataType) => { toast({ title: "Error", description: `Failed to clear ${dataType} data: ${error.message}`, variant: "destructive" }); },
  });

  const handleSaveNumberingSettings = () => {
    if (!companyInfo) return;
    const newSettings = {
        ...companyInfo,
        invoicePrefix,
        proformaPrefix,
        quotationPrefix,
        includeDateInNumber: includeDate,
    };
    saveCompanyMutation.mutate(newSettings);
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
    { id: "clearPurchases", label: "Clear Purchase Data", description: "Permanently delete all purchase invoices from the database.", dataType: 'purchases' as const },
    { id: "factoryReset", label: "Factory Reset Application", description: "Reset all database data and cloud settings. Requires app restart.", dataType: 'allData' as const },
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
         {companyInfo && !isLoadingCompanyInfo ? (
            <CompanySettingsForm 
              defaultValues={companyInfo} 
              onSuccess={() => refetchCompanyInfo()} 
            />
         ) : (
            <Card><CardContent className="pt-6"><div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin"/></div></CardContent></Card>
         )}
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
                      <Label htmlFor={`theme-${key}`} className={cn("flex flex-col items-center justify-center rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer h-28 text-center", selectedThemeKey === key ? "border-primary ring-2 ring-primary" : "border-muted")}>
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
            <CardHeader>
              <CardTitle>Document Numbering</CardTitle>
              <CardDescription>Configure prefixes and numbering display format (stored in the cloud).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch id="include-date-toggle" checked={includeDate} onCheckedChange={setIncludeDate} />
                <Label htmlFor="include-date-toggle" className="flex items-center gap-2">
                  Display Date in Document Number
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent>
                        <p>This only changes how numbers are displayed. The full unique ID is always stored.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoicePrefix">Tax Invoice Prefix (3 uppercase letters)</Label>
                <Input id="invoicePrefix" value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase().substring(0,3))} maxLength={3} className="max-w-[150px]" placeholder="e.g. INV"/>
                <p className="text-xs text-muted-foreground">Example: {includeDate ? `${(invoicePrefix || 'INV').padEnd(3,'X')}${exampleInvoiceDateString}0001` : `${(invoicePrefix || 'INV').padEnd(3,'X')}-0001`}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="proformaPrefix">Proforma Prefix (3 uppercase letters)</Label>
                <Input id="proformaPrefix" value={proformaPrefix} onChange={(e) => setProformaPrefix(e.target.value.toUpperCase().substring(0,3))} maxLength={3} className="max-w-[150px]" placeholder="e.g. PRF"/>
                <p className="text-xs text-muted-foreground">Example: {includeDate ? `${(proformaPrefix || 'PRF').padEnd(3,'X')}${exampleInvoiceDateString}0001` : `${(proformaPrefix || 'PRF').padEnd(3,'X')}-0001`}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quotationPrefix">Quotation Prefix (3 uppercase letters)</Label>
                <Input id="quotationPrefix" value={quotationPrefix} onChange={(e) => setQuotationPrefix(e.target.value.toUpperCase().substring(0,3))} maxLength={3} className="max-w-[150px]" placeholder="e.g. QTN"/>
                <p className="text-xs text-muted-foreground">Example: {includeDate ? `${(quotationPrefix || 'QTN').padEnd(3,'X')}${exampleInvoiceDateString}0001` : `${(quotationPrefix || 'QTN').padEnd(3,'X')}-0001`}</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveNumberingSettings} disabled={saveCompanyMutation.isPending}><Save className="mr-2 h-4 w-4" /> Save Numbering Settings</Button>
            </CardFooter>
          </Card>
           <MeasurementSettings />
        </TabsContent>
        
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Seed Sample Data</CardTitle>
              <CardDescription>Populate your database with samples to explore features. This is safe to run multiple times.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => seedMutation()} disabled={isSeeding || isDataClearing}>
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
