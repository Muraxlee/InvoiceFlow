
"use client";

import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, DatabaseZap, UsersRound, Brain, Sparkles, Trash2, Settings2 as SettingsIcon, Save, KeyRound, ExternalLink, Palette, Building, FileCog, ShieldCheck, Edit3, Download, Upload, Archive, Type, FileJson, Info } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { loadFromLocalStorage, saveToLocalStorage, INVOICE_CONFIG_KEY, DEFAULT_INVOICE_PREFIX, type InvoiceConfig, GOOGLE_AI_API_KEY_STORAGE_KEY, COMPANY_NAME_STORAGE_KEY, DEFAULT_COMPANY_NAME, CUSTOM_THEME_STORAGE_KEY, type CustomThemeValues, DEFAULT_CUSTOM_THEME_VALUES, CUSTOMERS_STORAGE_KEY, PRODUCTS_STORAGE_KEY, INVOICES_STORAGE_KEY, LAST_BACKUP_TIMESTAMP_KEY, type AllApplicationData} from "@/lib/localStorage";

import { THEME_STORAGE_KEY, AVAILABLE_THEMES, DEFAULT_THEME_KEY } from "@/app/layout"; 
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Link from "next/link";
import { format } from "date-fns"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import FontSettings from "@/components/font-settings";
import { CompanySettingsForm } from "@/components/company-settings-form";
import { getCompanyInfo as getDbCompanyInfo, saveCompanyInfo as saveDbCompanyInfo } from "@/lib/database-wrapper";


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
  const [companyInfo, setCompanyInfo] = useState<any>(null);


  const [customThemeValues, setCustomThemeValues] = useState<CustomThemeValues>(DEFAULT_CUSTOM_THEME_VALUES);
  const [originalCustomThemeValues, setOriginalCustomThemeValues] = useState<CustomThemeValues>(DEFAULT_CUSTOM_THEME_VALUES);
  const [lastBackupTimestamp, setLastBackupTimestamp] = useState<number | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);


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
    setLastBackupTimestamp(storedBackupTimestamp);
    
    setExampleInvoiceDateString(format(new Date(), 'ddMMyyyy'));

    const loadCompanyInfoFromDb = async () => {
      if (window.electronAPI) {
        try {
          const info = await getDbCompanyInfo();
          setCompanyInfo(info || { name: '', address: '', phone: '', email: '', gstin: '', bank_name: '', bank_account: '', bank_ifsc: '' });
        } catch (error) {
          console.error('Failed to load company info from DB:', error);
          setCompanyInfo({ name: '', address: '', phone: '', email: '', gstin: '', bank_name: '', bank_account: '', bank_ifsc: '' });
        }
      }
    };
    
    loadCompanyInfoFromDb();
  }, []);

  const handleDataAction = async (actionName: string, dataType?: 'customers' | 'products' | 'allData' | 'settings') => {
    console.log(`${actionName} for ${dataType} initiated`);
    let success = false;
    let requiresReload = false;

    if (window.electronAPI) {
        try {
            if (dataType === 'customers' && window.electronAPI.clearAllCustomers) {
                await window.electronAPI.clearAllCustomers();
                success = true;
            } else if (dataType === 'products' && window.electronAPI.clearAllProducts) {
                await window.electronAPI.clearAllProducts();
                success = true;
            } else if (dataType === 'allData' && window.electronAPI.clearAllData) { 
                await window.electronAPI.clearAllData(); 
                success = true; 
                 // Also clear company info form state if it was loaded from DB
                setCompanyInfo({ name: '', address: '', phone: '', email: '', gstin: '', bank_name: '', bank_account: '', bank_ifsc: '' });

            }
        } catch (error) {
            console.error(`Error clearing DB for ${dataType}:`, error);
            toast({ title: "Database Error", description: `Failed to clear ${dataType} from database.`, variant: "destructive" });
            return;
        }
    }

    if (dataType === 'allData' || dataType === 'settings') {
        const keysToClearFromLocalStorage = [
            COMPANY_NAME_STORAGE_KEY, 
            GOOGLE_AI_API_KEY_STORAGE_KEY, 
            INVOICE_CONFIG_KEY, 
            THEME_STORAGE_KEY, 
            CUSTOM_THEME_STORAGE_KEY, 
            LAST_BACKUP_TIMESTAMP_KEY
        ];
        keysToClearFromLocalStorage.forEach(key => localStorage.removeItem(key));
        
        setCompanyNameInput(DEFAULT_COMPANY_NAME);
        setCurrentCompanyName(DEFAULT_COMPANY_NAME);
        if (document) document.title = DEFAULT_COMPANY_NAME;
        setGoogleApiKey("");
        setOriginalGoogleApiKey("");
        const defaultConfig = { prefix: DEFAULT_INVOICE_PREFIX, dailyCounters: {} };
        saveToLocalStorage(INVOICE_CONFIG_KEY, defaultConfig);
        setInvoicePrefix(defaultConfig.prefix);
        setOriginalInvoicePrefix(defaultConfig.prefix);
        handleThemeChange(DEFAULT_THEME_KEY); 
        setCustomThemeValues(DEFAULT_CUSTOM_THEME_VALUES);
        setOriginalCustomThemeValues(DEFAULT_CUSTOM_THEME_VALUES);
        saveToLocalStorage(CUSTOM_THEME_STORAGE_KEY, DEFAULT_CUSTOM_THEME_VALUES);
        setLastBackupTimestamp(null);
        success = true; 
        requiresReload = true;
    }
    
    if (success) {
        toast({
        title: `${actionName} Successful`,
        description: `The ${actionName.toLowerCase()} operation has been completed. ${requiresReload ? 'Page will reload.' : ''}`,
        });
        if (requiresReload) {
            setTimeout(() => window.location.reload(), 1500);
        }
    } else {
         toast({
        title: `Action Not Fully Supported`,
        description: `Clearing ${dataType} might not be fully implemented for all data sources yet.`,
        variant: "warning"
        });
    }
  };

  const handleSaveInvoiceSettings = () => {
    const currentConfig = loadFromLocalStorage<InvoiceConfig>(INVOICE_CONFIG_KEY, {
      prefix: DEFAULT_INVOICE_PREFIX,
      dailyCounters: {},
    });
    
    let newPrefix = invoicePrefix.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
    
    if (newPrefix.length === 0 && invoicePrefix.length > 0) {
        toast({title: "Invalid Prefix", description: "Invoice prefix must contain letters and be 3 characters long.", variant: "destructive"});
        setInvoicePrefix(originalInvoicePrefix); 
        return;
    }
    if (newPrefix.length === 0 && invoicePrefix.length === 0) { 
      newPrefix = DEFAULT_INVOICE_PREFIX;
    } else if (newPrefix.length < 3) {
       toast({title: "Prefix Too Short", description: "Invoice prefix must be 3 letters.", variant: "destructive"});
       setInvoicePrefix(originalInvoicePrefix); 
       return;
    }

    currentConfig.prefix = newPrefix; 

    saveToLocalStorage(INVOICE_CONFIG_KEY, currentConfig);
    setInvoicePrefix(currentConfig.prefix); 
    setOriginalInvoicePrefix(currentConfig.prefix);
    toast({
      title: "Invoice Settings Saved",
      description: `Invoice prefix updated to ${currentConfig.prefix}.`,
    });
  };
  
  const handleSaveApiKey = () => {
    if (!googleApiKey.trim()) {
      saveToLocalStorage(GOOGLE_AI_API_KEY_STORAGE_KEY, "");
      setOriginalGoogleApiKey("");
      toast({
        title: "API Key Cleared",
        description: "Google AI API Key has been cleared from local storage. Restart server for changes to take effect.",
      });
      return;
    }
    saveToLocalStorage(GOOGLE_AI_API_KEY_STORAGE_KEY, googleApiKey);
    setOriginalGoogleApiKey(googleApiKey);
    toast({
      title: "API Key Saved",
      description: "Google AI API Key has been saved to local storage. Remember to set it in your .env file and restart the server.",
    });
  };

  const handleSaveAppTitle = () => {
    if (!companyNameInput.trim()) {
      toast({
        title: "Application Title Empty",
        description: "Please enter an application title.",
        variant: "destructive",
      });
      return;
    }
    saveToLocalStorage(COMPANY_NAME_STORAGE_KEY, companyNameInput);
    setCurrentCompanyName(companyNameInput);
    if (document) { 
        document.title = companyNameInput;
    }
    window.dispatchEvent(new StorageEvent('storage', { key: COMPANY_NAME_STORAGE_KEY, newValue: JSON.stringify(companyNameInput) }));
    toast({
      title: "Application Title Saved",
      description: `Application title updated to ${companyNameInput}.`,
    });
  };

  const handleThemeChange = useCallback((themeKey: string) => {
    if (AVAILABLE_THEMES[themeKey as keyof typeof AVAILABLE_THEMES]) {
      const htmlElement = document.documentElement;
      Object.keys(AVAILABLE_THEMES).forEach(key => {
        htmlElement.removeAttribute(`data-theme-${key}`);
      });
      htmlElement.setAttribute('data-theme', themeKey);
      localStorage.setItem(THEME_STORAGE_KEY, themeKey); 
      setSelectedThemeKey(themeKey);
      if (themeKey === 'custom') {
          const storedCustomTheme = loadFromLocalStorage<CustomThemeValues>(CUSTOM_THEME_STORAGE_KEY, DEFAULT_CUSTOM_THEME_VALUES);
          const root = document.documentElement;
          if (storedCustomTheme.background) root.style.setProperty('--background', storedCustomTheme.background);
          if (storedCustomTheme.foreground) root.style.setProperty('--foreground', storedCustomTheme.foreground);
          if (storedCustomTheme.primary) root.style.setProperty('--primary', storedCustomTheme.primary);
      } else { 
          const root = document.documentElement;
          root.style.removeProperty('--background');
          root.style.removeProperty('--foreground');
          root.style.removeProperty('--primary');
      }
      toast({
        title: "Theme Updated",
        description: `Theme changed to ${AVAILABLE_THEMES[themeKey as keyof typeof AVAILABLE_THEMES]}.`,
      });
    }
  }, [toast]);

  const handleSaveCustomTheme = () => {
    saveToLocalStorage(CUSTOM_THEME_STORAGE_KEY, customThemeValues);
    setOriginalCustomThemeValues(customThemeValues);
    toast({
      title: "Custom Theme Saved",
      description: "Your custom theme values have been saved.",
    });
    if (selectedThemeKey === 'custom') {
       window.dispatchEvent(new StorageEvent('storage', { key: CUSTOM_THEME_STORAGE_KEY, newValue: JSON.stringify(customThemeValues) }));
    }
  };

  const dataManagementActions = [
    { id: "clearCustomers", label: "Clear Customer Data", description: "Permanently delete all customer information from the database.", dataType: 'customers' as const },
    { id: "clearProducts", label: "Clear Product Data", description: "Permanently delete all product information from the database.", dataType: 'products' as const },
    { id: "factoryReset", label: "Factory Reset", description: "Reset all application data in the database and clear settings from local storage.", dataType: 'allData' as const },
  ];

  const handleExportSettings = () => {
    const settingsData: Partial<AllApplicationData> = {
      appThemeKey: loadFromLocalStorage(THEME_STORAGE_KEY, DEFAULT_THEME_KEY),
      [COMPANY_NAME_STORAGE_KEY]: loadFromLocalStorage(COMPANY_NAME_STORAGE_KEY, DEFAULT_COMPANY_NAME),
      [GOOGLE_AI_API_KEY_STORAGE_KEY]: loadFromLocalStorage(GOOGLE_AI_API_KEY_STORAGE_KEY, ""),
      [INVOICE_CONFIG_KEY]: loadFromLocalStorage(INVOICE_CONFIG_KEY, { prefix: DEFAULT_INVOICE_PREFIX, dailyCounters: {} }),
      [CUSTOM_THEME_STORAGE_KEY]: loadFromLocalStorage(CUSTOM_THEME_STORAGE_KEY, DEFAULT_CUSTOM_THEME_VALUES),
      appVersion: "1.0.0" // Example version
    };

    const jsonString = JSON.stringify(settingsData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `invoiceflow_settings_backup_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);

    setLastBackupTimestamp(Date.now());
    saveToLocalStorage(LAST_BACKUP_TIMESTAMP_KEY, Date.now());
    toast({ title: "Settings Exported", description: "All application settings have been exported." });
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const importedData = JSON.parse(json) as Partial<AllApplicationData>;

        if (importedData.appThemeKey && AVAILABLE_THEMES[importedData.appThemeKey as keyof typeof AVAILABLE_THEMES]) {
          handleThemeChange(importedData.appThemeKey);
        }
        if (importedData[COMPANY_NAME_STORAGE_KEY]) {
          saveToLocalStorage(COMPANY_NAME_STORAGE_KEY, importedData[COMPANY_NAME_STORAGE_KEY]);
          setCompanyNameInput(importedData[COMPANY_NAME_STORAGE_KEY]!);
        }
        if (importedData[GOOGLE_AI_API_KEY_STORAGE_KEY] !== undefined) {
          saveToLocalStorage(GOOGLE_AI_API_KEY_STORAGE_KEY, importedData[GOOGLE_AI_API_KEY_STORAGE_KEY]);
          setGoogleApiKey(importedData[GOOGLE_AI_API_KEY_STORAGE_KEY]!);
        }
        if (importedData[INVOICE_CONFIG_KEY]) {
          saveToLocalStorage(INVOICE_CONFIG_KEY, importedData[INVOICE_CONFIG_KEY]);
          setInvoicePrefix(importedData[INVOICE_CONFIG_KEY]!.prefix);
        }
        if (importedData[CUSTOM_THEME_STORAGE_KEY]) {
          saveToLocalStorage(CUSTOM_THEME_STORAGE_KEY, importedData[CUSTOM_THEME_STORAGE_KEY]);
          setCustomThemeValues(importedData[CUSTOM_THEME_STORAGE_KEY]!);
        }
        
        toast({ title: "Settings Imported", description: "Application settings have been imported. Page will reload." });
        setTimeout(() => window.location.reload(), 1000);

      } catch (error) {
        console.error("Error importing settings:", error);
        toast({ title: "Import Error", description: "Failed to import settings. The file might be corrupted or in the wrong format.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if(importFileRef.current) importFileRef.current.value = ""; // Reset file input
  };


  return (
    <div className="space-y-6">
      <PageHeader 
        title="Settings" 
        description="Manage your application settings and preferences." 
      />

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="w-full grid md:grid-cols-5">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">Company</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileCog className="h-4 w-4" />
            <span className="hidden sm:inline">Invoices</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">AI</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <DatabaseZap className="h-4 w-4" />
            <span className="hidden sm:inline">Data</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="company" className="space-y-6">
         <CompanySettingsForm 
            defaultValues={companyInfo} 
            onSuccess={async () => {
              if (window.electronAPI) {
                const info = await getDbCompanyInfo();
                setCompanyInfo(info);
                 // Also update the app title if company name from DB is being used for it
                if (info?.name) {
                    saveToLocalStorage(COMPANY_NAME_STORAGE_KEY, info.name);
                    setCurrentCompanyName(info.name);
                    setCompanyNameInput(info.name); // Sync input field
                    if (document) document.title = info.name;
                    window.dispatchEvent(new StorageEvent('storage', { key: COMPANY_NAME_STORAGE_KEY, newValue: JSON.stringify(info.name) }));
                }
              }
            }} 
          />
          <Card>
            <CardHeader>
              <CardTitle>Application Title</CardTitle>
              <CardDescription>Update the name displayed in the browser tab and application title (stored locally).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="appTitle">Application Title</Label>
                  <div className="flex w-full items-center gap-2">
                    <Input
                      id="appTitle"
                      placeholder="Enter your application title"
                      value={companyNameInput}
                      onChange={(e) => setCompanyNameInput(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleSaveAppTitle} size="sm" disabled={companyNameInput === currentCompanyName}>
                      <Save className="mr-2 h-4 w-4" /> Save
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Current: <span className="font-medium">{currentCompanyName}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Theme Settings</CardTitle>
                <CardDescription>
                  Customize the look and feel of the application. Select a theme below.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <RadioGroup
                    value={selectedThemeKey}
                    onValueChange={handleThemeChange}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    {Object.entries(AVAILABLE_THEMES).map(([key, name]) => (
                      <div key={key}>
                        <RadioGroupItem
                          value={key}
                          id={`theme-${key}`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`theme-${key}`}
                          className={cn(
                            "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer h-28",
                            selectedThemeKey === key ? "border-primary ring-2 ring-primary" : "border-muted"
                          )}
                        >
                          <div className="mb-2 h-5 w-5 rounded-full border" style={{
                            background: key === 'custom' ? (customThemeValues.primary ? `hsl(${customThemeValues.primary})` : 'var(--sidebar-primary, var(--primary))') : `var(--sidebar-primary, var(--primary))`
                          }} data-theme-preview={key} />
                          <div className="font-medium text-center text-xs">{name}</div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {selectedThemeKey === 'custom' && (
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium">Custom Theme Properties</h4>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="bg-color">Background Color (HSL)</Label>
                      <Input
                        id="bg-color"
                        placeholder="e.g., 220 15% 15%"
                        value={customThemeValues.background || ''}
                        onChange={(e) => setCustomThemeValues(prev => ({ ...prev, background: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="fg-color">Foreground Color (HSL)</Label>
                      <Input
                        id="fg-color"
                        placeholder="e.g., 220 10% 85%"
                        value={customThemeValues.foreground || ''}
                        onChange={(e) => setCustomThemeValues(prev => ({ ...prev, foreground: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="primary-color">Primary Color (HSL)</Label>
                      <Input
                        id="primary-color"
                        placeholder="e.g., 180 60% 45%"
                        value={customThemeValues.primary || ''}
                        onChange={(e) => setCustomThemeValues(prev => ({ ...prev, primary: e.target.value }))}
                      />
                      <p className="text-sm text-muted-foreground">Format example: hue saturation% lightness% (e.g. 260 25% 7%)</p>
                    </div>
                    
                    <Button onClick={handleSaveCustomTheme} className="w-full mt-2" disabled={JSON.stringify(customThemeValues) === JSON.stringify(originalCustomThemeValues)}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Custom Theme
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <FontSettings />
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileCog className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle className="text-xl">Invoice Settings</CardTitle>
                  <CardDescription>Configure invoice numbering prefix (stored in local browser).</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invoicePrefix">Invoice Prefix (3 uppercase letters)</Label>
                <div className="flex gap-2 items-center flex-wrap">
                    <Input 
                        id="invoicePrefix" 
                        value={invoicePrefix} 
                        onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase().substring(0,3))}
                        maxLength={3}
                        className="max-w-[100px] flex-grow sm:flex-grow-0"
                        placeholder="e.g. INV"
                    />
                    <Button onClick={handleSaveInvoiceSettings} disabled={invoicePrefix === originalInvoicePrefix && invoicePrefix.length === 3}>
                        <Save className="mr-2 h-4 w-4" /> Save Prefix
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Example: {(invoicePrefix || 'INV').padEnd(3,'X')}{exampleInvoiceDateString}0001
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Brain className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle className="text-xl">AI Settings</CardTitle>
                  <CardDescription>Configure AI-powered features.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="googleApiKey">Google AI API Key (stored in local browser)</Label>
                <div className="flex gap-2 items-center flex-wrap">
                  <Input
                    id="googleApiKey"
                    type="password"
                    value={googleApiKey}
                    onChange={(e) => setGoogleApiKey(e.target.value)}
                    className="max-w-md flex-grow"
                    placeholder="Enter your Google AI API Key"
                  />
                  <Button onClick={handleSaveApiKey} disabled={googleApiKey === originalGoogleApiKey}>
                    <Save className="mr-2 h-4 w-4" /> {googleApiKey ? "Save" : "Clear"} Key
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your API key is stored locally in your browser's local storage.
                </p>
              </div>
              <div className="text-sm space-y-2 p-4 border rounded-md bg-muted/50">
                <h4 className="font-semibold text-md flex items-center gap-2"><KeyRound className="h-5 w-5"/> Using Your Google AI API Key</h4>
                <p>
                  The AI features use Google AI models through Genkit. To enable them, you need a Google AI API Key.
                </p>
                <p>
                  <strong>How to get an API Key:</strong>
                  <Link href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="ml-1 text-primary hover:underline inline-flex items-center">
                    Visit Google AI Studio <ExternalLink className="h-3 w-3 ml-1"/>
                  </Link>
                  and create a new API key.
                </p>
                <p className="font-semibold text-destructive">
                  <strong>Important:</strong> For the AI features to use your key with Genkit:
                </p>
                <ol className="list-decimal list-inside pl-4 space-y-1 text-muted-foreground">
                  <li>Save your API key using the button above (this stores it in your browser for reference).</li>
                  <li>Create or open the <code className="bg-secondary px-1 py-0.5 rounded text-foreground">.env</code> file in the **root directory of this project**.</li>
                  <li>Add (or modify/remove) the following line, replacing `YOUR_API_KEY_HERE` with your actual key:
                     <pre className="mt-1 p-2 bg-card rounded text-xs overflow-x-auto">GOOGLE_API_KEY=YOUR_API_KEY_HERE</pre>
                     If clearing, you can remove this line or set it to empty: <code className="bg-secondary px-1 py-0.5 rounded text-foreground">GOOGLE_API_KEY=</code>
                  </li>
                  <li><strong>Restart your development server</strong> (both <code className="bg-secondary px-1 py-0.5 rounded text-foreground">npm run dev</code> and <code className="bg-secondary px-1 py-0.5 rounded text-foreground">npm run genkit:dev</code> if it's running). This step is crucial for Genkit to pick up the key from the server environment.</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="data" className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Archive className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle className="text-xl">Application Settings Backup (Local Storage)</CardTitle>
                  <CardDescription>Export or import your application settings (theme, API key, etc.). This does NOT include database data.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={handleExportSettings} className="w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" /> Export All Settings
                </Button>
                 <p className="text-xs text-muted-foreground">Last settings export: {lastBackupTimestamp ? format(new Date(lastBackupTimestamp), "PPP p") : "Never"}</p>
              
              <div className="space-y-2">
                <Label htmlFor="importSettingsFile">Import Settings from JSON</Label>
                <div className="flex items-center gap-2">
                    <Input 
                        id="importSettingsFile" 
                        type="file" 
                        accept=".json" 
                        ref={importFileRef}
                        onChange={handleImportSettings}
                        className="flex-1"
                    />
                </div>
                 <p className="text-xs text-muted-foreground">Importing settings will overwrite current settings and reload the page.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <DatabaseZap className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle className="text-xl">Database Backup & Restore (Manual)</CardTitle>
                  <CardDescription>Instructions for manually managing your Electron SQLite database file.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="flex items-center gap-2"><Info className="h-4 w-4 text-blue-500" /> Your main application data (invoices, customers, products, company details) is stored in an SQLite database file named <code className="font-mono bg-muted px-1 py-0.5 rounded">invoiceflow.db</code>.</p>
              <div>
                <h4 className="font-semibold">To Manually Back Up Your Database:</h4>
                <ol className="list-decimal list-inside pl-4 text-muted-foreground">
                  <li>Close the InvoiceFlow application.</li>
                  <li>Navigate to the Electron user data directory for this application. This is typically:
                    <ul className="list-disc list-inside pl-4">
                        <li>Windows: <code className="font-mono bg-muted px-1 py-0.5 rounded">%APPDATA%\invoiceflow</code> (e.g., C:\Users\YourUser\AppData\Roaming\invoiceflow)</li>
                        <li>macOS: <code className="font-mono bg-muted px-1 py-0.5 rounded">~/Library/Application Support/invoiceflow</code></li>
                        <li>Linux: <code className="font-mono bg-muted px-1 py-0.5 rounded">~/.config/invoiceflow</code></li>
                    </ul>
                  </li>
                  <li>Copy the <code className="font-mono bg-muted px-1 py-0.5 rounded">invoiceflow.db</code> file from this directory to a safe backup location.</li>
                </ol>
              </div>
               <div>
                <h4 className="font-semibold">To Manually Restore Your Database:</h4>
                 <ol className="list-decimal list-inside pl-4 text-muted-foreground">
                  <li>Close the InvoiceFlow application.</li>
                  <li>Navigate to the Electron user data directory (see paths above).</li>
                  <li>Replace the existing <code className="font-mono bg-muted px-1 py-0.5 rounded">invoiceflow.db</code> file with your backup copy.</li>
                  <li>Restart the InvoiceFlow application.</li>
                </ol>
              </div>
              <p className="text-xs text-destructive font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Ensure the application is closed before replacing the database file to avoid data corruption.</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-destructive">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Trash2 className="h-8 w-8 text-destructive" />
                <div>
                  <CardTitle className="text-xl">Data Management (Electron Database)</CardTitle>
                  <CardDescription className="text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> Warning: These actions are irreversible.
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
                        <Trash2 className="mr-2 h-4 w-4" /> {action.label.replace(/\s\(.*\)/, '')}
                      </Button>
                    }
                    title={`Confirm ${action.label}`}
                    description={`Are you sure? This cannot be undone.`}
                    onConfirm={() => handleDataAction(action.label, action.dataType)}
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
                  <CardDescription>Define user roles and permissions (placeholder).</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mt-4 p-6 border-2 border-dashed border-border rounded-md text-center">
                <UsersRound className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">User role management interface coming soon.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

