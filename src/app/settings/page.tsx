
"use client";

import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, DatabaseZap, UsersRound, Brain, Sparkles, Trash2, Settings2 as SettingsIcon, Save, KeyRound, ExternalLink, Palette, Building, FileCog, ShieldCheck, Edit3, Download, Upload, Archive, Type, FileJson, Info, Database, FolderInput, Loader2 } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { loadFromLocalStorage, saveToLocalStorage, INVOICE_CONFIG_KEY, DEFAULT_INVOICE_PREFIX, type InvoiceConfig, GOOGLE_AI_API_KEY_STORAGE_KEY, COMPANY_NAME_STORAGE_KEY, DEFAULT_COMPANY_NAME, CUSTOM_THEME_STORAGE_KEY, type CustomThemeValues, DEFAULT_CUSTOM_THEME_VALUES, LAST_BACKUP_TIMESTAMP_KEY, type AllApplicationData, CUSTOMERS_STORAGE_KEY, PRODUCTS_STORAGE_KEY, INVOICES_STORAGE_KEY} from "@/lib/localStorage";

import { THEME_STORAGE_KEY, AVAILABLE_THEMES, DEFAULT_THEME_KEY } from "@/app/layout"; 
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Link from "next/link";
import { format } from "date-fns"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import FontSettings from "@/components/font-settings";
import { CompanySettingsForm, type CompanyInfo } from "@/components/company-settings-form";
import { getCompanyInfo as getDbCompanyInfo } from "@/lib/database-wrapper"; 
import UserManagementSettings from "./user-management-settings";

const initialCompanyInfo: CompanyInfo = {
  name: '', address: '', phone: '', phone2: '', email: '', gstin: '',
  bank_account_name: '', bank_name: '', bank_account: '', bank_ifsc: ''
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [invoicePrefix, setInvoicePrefix] = useState(DEFAULT_INVOICE_PREFIX);
  const [originalInvoicePrefix, setOriginalInvoicePrefix] = useState(DEFAULT_INVOICE_PREFIX);
  const [googleApiKey, setGoogleApiKey] = useState("");
  const [originalGoogleApiKey, setOriginalGoogleApiKey] = useState("");
  const [selectedThemeKey, setSelectedThemeKey] = useState<string>(DEFAULT_THEME_KEY);
  const [companyNameInput, setCompanyNameInput] = useState(DEFAULT_COMPANY_NAME); 
  const [currentCompanyName, setCurrentCompanyName] = useState(DEFAULT_COMPANY_NAME); 
  const [exampleInvoiceDateString, setExampleInvoiceDateString] = useState(""); 
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);


  const [customThemeValues, setCustomThemeValues] = useState<CustomThemeValues>(DEFAULT_CUSTOM_THEME_VALUES);
  const [originalCustomThemeValues, setOriginalCustomThemeValues] = useState<CustomThemeValues>(DEFAULT_CUSTOM_THEME_VALUES);
  
  const [lastSettingsBackupTimestamp, setLastSettingsBackupTimestamp] = useState<number | null>(null);
  const importSettingsFileRef = useRef<HTMLInputElement>(null);

  const [currentDbPath, setCurrentDbPath] = useState<string | null>(null);
  const [isDbOperationLoading, setIsDbOperationLoading] = useState(false);
  // Removed restoreFileRef as restore file selection will be handled by main process dialog

  useEffect(() => {
    const config = loadFromLocalStorage<InvoiceConfig>(INVOICE_CONFIG_KEY, { 
      prefix: DEFAULT_INVOICE_PREFIX, 
      dailyCounters: {} 
    });
    setInvoicePrefix(config.prefix);
    setOriginalInvoicePrefix(config.prefix);

    const storedApiKey = loadFromLocalStorage<string>(GOOGLE_AI_API_KEY_STORAGE_KEY, "");
    setGoogleApiKey(storedApiKey);
    setOriginalGoogleApiKey(storedApiKey);

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

    async function fetchDbPath() {
      if (window.electronAPI?.getDatabasePath) {
        try {
          const path = await window.electronAPI.getDatabasePath();
          setCurrentDbPath(path);
        } catch (error) {
          console.error("Error fetching DB path:", error);
          setCurrentDbPath("Could not fetch database path.");
        }
      }
    }
    fetchDbPath();

  }, []);


  const handleDataAction = async (actionName: string, dataType?: 'customers' | 'products' | 'allData' | 'settings') => {
    console.log(`${actionName} for ${dataType} initiated`);
    let success = false;
    let requiresReload = false;

    if (window.electronAPI) {
        try {
            if (dataType === 'customers' && window.electronAPI.clearAllCustomers) {
                await window.electronAPI.clearAllCustomers(); success = true;
            } else if (dataType === 'products' && window.electronAPI.clearAllProducts) {
                await window.electronAPI.clearAllProducts(); success = true;
            } else if (dataType === 'allData' && window.electronAPI.clearAllData) { 
                await window.electronAPI.clearAllData(); success = true; 
                setCompanyInfo(initialCompanyInfo);
            }
        } catch (error) {
            console.error(`Error clearing DB for ${dataType}:`, error);
            toast({ title: "Database Error", description: `Failed to clear ${dataType} from database.`, variant: "destructive" });
            return;
        }
    }

    if (dataType === 'allData' || dataType === 'settings') {
        const keysToClearFromLocalStorage = [
            COMPANY_NAME_STORAGE_KEY, GOOGLE_AI_API_KEY_STORAGE_KEY, INVOICE_CONFIG_KEY, 
            THEME_STORAGE_KEY, CUSTOM_THEME_STORAGE_KEY, LAST_BACKUP_TIMESTAMP_KEY,
            CUSTOMERS_STORAGE_KEY, PRODUCTS_STORAGE_KEY, INVOICES_STORAGE_KEY // Clear these as well if factory resetting
        ];
        keysToClearFromLocalStorage.forEach(key => localStorage.removeItem(key));
        
        setCompanyNameInput(DEFAULT_COMPANY_NAME);
        setCurrentCompanyName(DEFAULT_COMPANY_NAME);
        if (document) document.title = DEFAULT_COMPANY_NAME;
        setGoogleApiKey(""); setOriginalGoogleApiKey("");
        const defaultConfig = { prefix: DEFAULT_INVOICE_PREFIX, dailyCounters: {} };
        saveToLocalStorage(INVOICE_CONFIG_KEY, defaultConfig);
        setInvoicePrefix(defaultConfig.prefix); setOriginalInvoicePrefix(defaultConfig.prefix);
        handleThemeChange(DEFAULT_THEME_KEY); 
        setCustomThemeValues(DEFAULT_CUSTOM_THEME_VALUES); setOriginalCustomThemeValues(DEFAULT_CUSTOM_THEME_VALUES);
        saveToLocalStorage(CUSTOM_THEME_STORAGE_KEY, DEFAULT_CUSTOM_THEME_VALUES);
        setLastSettingsBackupTimestamp(null); saveToLocalStorage(LAST_BACKUP_TIMESTAMP_KEY, null);
        success = true; requiresReload = true;
    }
    
    if (success) {
        toast({
        title: `${actionName} Successful`,
        description: `The ${actionName.toLowerCase()} operation has been completed. ${requiresReload ? 'Page will reload.' : ''}`,
        });
        if (requiresReload) setTimeout(() => window.location.reload(), 1500);
    } else {
         toast({ title: `Action Not Fully Supported`, description: `Operation for ${dataType} might not be fully implemented.`, variant: "warning"});
    }
  };

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
  
  const handleSaveApiKey = () => {
    if (!googleApiKey.trim()) {
      saveToLocalStorage(GOOGLE_AI_API_KEY_STORAGE_KEY, ""); setOriginalGoogleApiKey("");
      toast({ title: "API Key Cleared", description: "Google AI API Key has been cleared. Restart server for changes to take effect."}); return;
    }
    saveToLocalStorage(GOOGLE_AI_API_KEY_STORAGE_KEY, googleApiKey); setOriginalGoogleApiKey(googleApiKey);
    toast({ title: "API Key Saved", description: "Google AI API Key has been saved. Set it in .env and restart server."});
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

  const handleExportSettings = () => {
    const settingsData: Partial<AllApplicationData> = {
      appThemeKey: loadFromLocalStorage(THEME_STORAGE_KEY, DEFAULT_THEME_KEY),
      [COMPANY_NAME_STORAGE_KEY]: loadFromLocalStorage(COMPANY_NAME_STORAGE_KEY, DEFAULT_COMPANY_NAME),
      [GOOGLE_AI_API_KEY_STORAGE_KEY]: loadFromLocalStorage(GOOGLE_AI_API_KEY_STORAGE_KEY, ""),
      [INVOICE_CONFIG_KEY]: loadFromLocalStorage(INVOICE_CONFIG_KEY, { prefix: DEFAULT_INVOICE_PREFIX, dailyCounters: {} }),
      [CUSTOM_THEME_STORAGE_KEY]: loadFromLocalStorage(CUSTOM_THEME_STORAGE_KEY, DEFAULT_CUSTOM_THEME_VALUES),
      appVersion: "1.0.0" 
    };
    const jsonString = JSON.stringify(settingsData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `invoiceflow_app_settings_backup_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(href);
    setLastSettingsBackupTimestamp(Date.now()); saveToLocalStorage(LAST_BACKUP_TIMESTAMP_KEY, Date.now());
    toast({ title: "Application Settings Exported", description: "Settings from local storage have been exported." });
  };

  const handleImportSettingsFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string; const importedData = JSON.parse(json) as Partial<AllApplicationData>;
        if (importedData.appThemeKey && AVAILABLE_THEMES[importedData.appThemeKey as keyof typeof AVAILABLE_THEMES]) handleThemeChange(importedData.appThemeKey);
        if (importedData[COMPANY_NAME_STORAGE_KEY]) { saveToLocalStorage(COMPANY_NAME_STORAGE_KEY, importedData[COMPANY_NAME_STORAGE_KEY]); setCompanyNameInput(importedData[COMPANY_NAME_STORAGE_KEY]!);}
        if (importedData[GOOGLE_AI_API_KEY_STORAGE_KEY] !== undefined) { saveToLocalStorage(GOOGLE_AI_API_KEY_STORAGE_KEY, importedData[GOOGLE_AI_API_KEY_STORAGE_KEY]); setGoogleApiKey(importedData[GOOGLE_AI_API_KEY_STORAGE_KEY]!);}
        if (importedData[INVOICE_CONFIG_KEY]) { saveToLocalStorage(INVOICE_CONFIG_KEY, importedData[INVOICE_CONFIG_KEY]); setInvoicePrefix(importedData[INVOICE_CONFIG_KEY]!.prefix);}
        if (importedData[CUSTOM_THEME_STORAGE_KEY]) { saveToLocalStorage(CUSTOM_THEME_STORAGE_KEY, importedData[CUSTOM_THEME_STORAGE_KEY]); setCustomThemeValues(importedData[CUSTOM_THEME_STORAGE_KEY]!);}
        toast({ title: "Settings Imported", description: "Application settings imported. Page will reload." });
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        console.error("Error importing settings:", error);
        toast({ title: "Import Error", description: "Failed to import settings. File might be corrupted or invalid.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if(importSettingsFileRef.current) importSettingsFileRef.current.value = ""; 
  };

  const handleBackupDatabase = async () => {
    if (!window.electronAPI?.backupDatabase) {
      toast({ title: "Feature Not Available", description: "Database backup is only available in the Electron app.", variant: "warning" });
      return;
    }
    setIsDbOperationLoading(true);
    try {
      const result = await window.electronAPI.backupDatabase();
      if (result.success) {
        toast({ title: "Database Backup Successful", description: `Database backed up to: ${result.path}` });
      } else {
        toast({ title: "Database Backup Cancelled or Failed", description: result.message || "Could not complete backup.", variant: result.message ? "info" : "destructive" });
      }
    } catch (error) {
      console.error("Database backup error:", error);
      toast({ title: "Database Backup Error", description: "An error occurred during backup.", variant: "destructive" });
    } finally {
      setIsDbOperationLoading(false);
    }
  };
  
  const triggerAndExecuteRestore = async () => {
    if (!window.electronAPI?.initiateDatabaseRestore) {
      toast({ title: "Feature Not Available", description: "Database restore is only available in the Electron app.", variant: "warning" });
      return;
    }
    setIsDbOperationLoading(true);
    try {
      const result = await window.electronAPI.initiateDatabaseRestore();
      if (result.success) {
        toast({ title: "Database Restore Successful", description: "Database restored. Please restart the application." });
      } else {
        toast({ title: "Database Restore Cancelled or Failed", description: result.message || "Could not complete restore.", variant: result.message ? "info" : "destructive" });
      }
    } catch (error: any) {
      console.error("Database restore error:", error);
      toast({ title: "Database Restore Error", description: error.message || "An error occurred during restore.", variant: "destructive" });
    } finally {
      setIsDbOperationLoading(false);
    }
  };

  const handleRestoreWithMandatoryBackup = async () => {
     if (!window.electronAPI?.backupDatabase || !window.electronAPI?.initiateDatabaseRestore) {
      toast({ title: "Feature Not Available", description: "Database backup/restore is only available in the Electron app.", variant: "warning" });
      return;
    }
    setIsDbOperationLoading(true);
    try {
      const backupResult = await window.electronAPI.backupDatabase();
      if (backupResult.success) {
        toast({ title: "Pre-Restore Backup Successful", description: `Current database backed up to ${backupResult.path}. Proceeding with restore.`});
        await triggerAndExecuteRestore(); // This will open the dialog to select file to restore
      } else {
        toast({ title: "Pre-Restore Backup Failed", description: "Could not back up current database. Restore cancelled.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Pre-Restore Backup Error", description: "An error occurred during pre-restore backup.", variant: "destructive" });
      console.error("Pre-restore backup error", err);
    } finally {
      setIsDbOperationLoading(false);
    }
  };


  return (
    <div className="space-y-6">
      <PageHeader 
        title="Application Settings" 
        description="Configure various aspects of the application." 
      />

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="w-full grid grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="company" className="flex items-center gap-2"><Building className="h-4 w-4" /><span className="hidden sm:inline">Company</span></TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2"><Palette className="h-4 w-4" /><span className="hidden sm:inline">Appearance</span></TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2"><FileCog className="h-4 w-4" /><span className="hidden sm:inline">Modules</span></TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2"><UsersRound className="h-4 w-4" /><span className="hidden sm:inline">Users</span></TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2"><DatabaseZap className="h-4 w-4" /><span className="hidden sm:inline">Data</span></TabsTrigger>
        </TabsList>
        
        <TabsContent value="company" className="space-y-6">
         <CompanySettingsForm 
            defaultValues={companyInfo || initialCompanyInfo} 
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
          <Card>
            <CardHeader><CardTitle>AI Settings</CardTitle><CardDescription>Configure AI-powered features.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="googleApiKey">Google AI API Key (stored locally)</Label>
                <div className="flex gap-2 items-center flex-wrap">
                  <Input id="googleApiKey" type="password" value={googleApiKey} onChange={(e) => setGoogleApiKey(e.target.value)} className="max-w-md flex-grow" placeholder="Enter Google AI API Key"/>
                  <Button onClick={handleSaveApiKey} disabled={googleApiKey === originalGoogleApiKey}><Save className="mr-2 h-4 w-4" /> {googleApiKey ? "Save" : "Clear"} Key</Button>
                </div>
                <p className="text-xs text-muted-foreground">Your API key is stored locally in your browser for display and reference.</p>
              </div>
              <div className="text-sm space-y-2 p-4 border rounded-md bg-muted/50">
                <h4 className="font-semibold text-md flex items-center gap-2"><KeyRound className="h-5 w-5"/> Using Your Google AI API Key</h4>
                <p>AI features use Google AI models. Get your key from <Link href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center">Google AI Studio <ExternalLink className="h-3 w-3 ml-1"/></Link>.</p>
                <p className="font-semibold text-destructive">Important:</p>
                <ol className="list-decimal list-inside pl-4 space-y-1 text-muted-foreground">
                  <li>Save your key above (stores in browser for your reference).</li>
                  <li>Create/open a <code className="bg-secondary px-1 py-0.5 rounded text-foreground">.env</code> file in the project's root directory.</li>
                  <li>Add the line: <pre className="mt-1 p-2 bg-card rounded text-xs overflow-x-auto">GOOGLE_API_KEY=YOUR_API_KEY_HERE</pre></li>
                  <li><strong>Restart development server(s)</strong> (Next.js & Genkit) for Genkit to pick up the key.</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
           <UserManagementSettings />
        </TabsContent>
        
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Database Management (SQLite)</CardTitle><CardDescription>Backup or restore your main application database (invoices, customers, products, users, company info).</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Active Database Path</Label>
                <p className="text-xs text-muted-foreground break-all">{currentDbPath || "Loading path..."}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleBackupDatabase} disabled={isDbOperationLoading || !window.electronAPI?.backupDatabase} className="w-full sm:w-auto">
                  {isDbOperationLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Database className="mr-2 h-4 w-4" /> Backup Database
                </Button>
                
                <ConfirmDialog
                  triggerButton={
                    <Button variant="outline" disabled={isDbOperationLoading || !window.electronAPI?.initiateDatabaseRestore} className="w-full sm:w-auto">
                      {isDbOperationLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <FolderInput className="mr-2 h-4 w-4" /> Restore Database
                    </Button>
                  }
                  title="Confirm Database Restore"
                  description={
                    <div className="space-y-3">
                      <div className="text-destructive font-semibold flex items-center gap-1"><AlertTriangle className="h-4 w-4"/>Restoring will overwrite your current database. This action cannot be undone.</div>
                      <div>It is <strong className="text-primary">STRONGLY RECOMMENDED</strong> to back up your current database before proceeding.</div>
                    </div>
                  }
                  confirmText="Backup Now & Select Restore File"
                  onConfirm={handleRestoreWithMandatoryBackup}
                  cancelText="Cancel"
                />
              </div>
              <p className="text-xs text-muted-foreground">Restoring a database requires an application restart to apply changes reliably.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Application Settings Backup (Local Storage)</CardTitle><CardDescription>Export or import application settings (theme, API key, etc.). Does NOT include database data.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={handleExportSettings} className="w-full sm:w-auto"><Download className="mr-2 h-4 w-4" /> Export Settings (JSON)</Button>
                <p className="text-xs text-muted-foreground">Last settings export: {lastSettingsBackupTimestamp ? format(new Date(lastSettingsBackupTimestamp), "PPP p") : "Never"}</p>
              <div className="space-y-2">
                <Label htmlFor="importSettingsFile">Import Settings from JSON</Label>
                <Input id="importSettingsFile" type="file" accept=".json" ref={importSettingsFileRef} onChange={handleImportSettingsFileChange} className="max-w-md"/>
                <p className="text-xs text-muted-foreground">Importing settings will overwrite current settings and reload the page.</p>
              </div>
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
                    triggerButton={<Button variant="destructive" className="w-full sm:w-auto"><Trash2 className="mr-2 h-4 w-4" /> {action.label.replace(/\s\(.*\)/, '')}</Button>}
                    title={`Confirm ${action.label}`}
                    description={`Are you sure? This cannot be undone.`}
                    onConfirm={() => handleDataAction(action.label, action.dataType)}
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
