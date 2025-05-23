"use client";

import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, DatabaseZap, UsersRound, Brain, Sparkles, Trash2, Settings2 as SettingsIcon, Save, KeyRound, ExternalLink, Palette, Building, FileCog, ShieldCheck, Edit3, Download, Upload, Archive, Type } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { loadFromLocalStorage, saveToLocalStorage, INVOICE_CONFIG_KEY, DEFAULT_INVOICE_PREFIX, type InvoiceConfig, GOOGLE_AI_API_KEY_STORAGE_KEY, COMPANY_NAME_STORAGE_KEY, DEFAULT_COMPANY_NAME, CUSTOM_THEME_STORAGE_KEY, type CustomThemeValues, DEFAULT_CUSTOM_THEME_VALUES, CUSTOMERS_STORAGE_KEY, PRODUCTS_STORAGE_KEY, INVOICES_STORAGE_KEY, LAST_BACKUP_TIMESTAMP_KEY, type AllApplicationData} from "@/lib/localStorage";
import { getCompanyInfo } from "@/lib/database-wrapper";
import { CompanySettingsForm } from "@/components/company-settings-form";
import { THEME_STORAGE_KEY, AVAILABLE_THEMES, DEFAULT_THEME_KEY } from "@/app/layout"; 
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Link from "next/link";
import { format } from "date-fns"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import FontSettings from "@/components/font-settings";

export default function SettingsPage() {
  const { toast } = useToast();
  const [invoicePrefix, setInvoicePrefix] = useState(DEFAULT_INVOICE_PREFIX);
  const [originalInvoicePrefix, setOriginalInvoicePrefix] = useState(DEFAULT_INVOICE_PREFIX);
  const [googleApiKey, setGoogleApiKey] = useState("");
  const [originalGoogleApiKey, setOriginalGoogleApiKey] = useState("");
  const [selectedThemeKey, setSelectedThemeKey] = useState<string>(DEFAULT_THEME_KEY);
  const [companyNameInput, setCompanyNameInput] = useState(DEFAULT_COMPANY_NAME);
  const [currentCompanyName, setCurrentCompanyName] = useState(DEFAULT_COMPANY_NAME);
  const [exampleInvoiceDateString, setExampleInvoiceDateString] = useState("DDMMYYYY");
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

    const storedCompanyName = loadFromLocalStorage<string>(COMPANY_NAME_STORAGE_KEY, DEFAULT_COMPANY_NAME);
    setCompanyNameInput(storedCompanyName);
    setCurrentCompanyName(storedCompanyName);
    
    const storedCustomTheme = loadFromLocalStorage<CustomThemeValues>(CUSTOM_THEME_STORAGE_KEY, DEFAULT_CUSTOM_THEME_VALUES);
    setCustomThemeValues(storedCustomTheme);
    setOriginalCustomThemeValues(storedCustomTheme);

    const storedBackupTimestamp = loadFromLocalStorage<number | null>(LAST_BACKUP_TIMESTAMP_KEY, null);
    setLastBackupTimestamp(storedBackupTimestamp);

    setExampleInvoiceDateString(format(new Date(), 'ddMMyyyy'));
    
    // Load company info from database
    const loadCompanyInfo = async () => {
      try {
        const info = await getCompanyInfo();
        if (info) {
          setCompanyInfo(info);
        } else {
          console.log('No company info found, using empty object as fallback');
          setCompanyInfo({
            name: '',
            address: '',
            phone: '',
            email: '',
            gstin: '',
            bank_name: '',
            bank_account: '',
            bank_ifsc: '',
          });
        }
      } catch (error) {
        console.error('Failed to load company info:', error);
        // Set empty default values as fallback
        setCompanyInfo({
          name: '',
          address: '',
          phone: '',
          email: '',
          gstin: '',
          bank_name: '',
          bank_account: '',
          bank_ifsc: '',
        });
      }
    };
    
    loadCompanyInfo();

  }, []);

  const handleDataAction = (actionName: string, storageKey?: string | string[]) => {
    if (typeof window !== 'undefined') {
      if (storageKey) {
        const keysToClear = Array.isArray(storageKey) ? storageKey : [storageKey];
        keysToClear.forEach(key => {
          localStorage.removeItem(key);
          // Reset specific states if their corresponding key is cleared
          if (key === COMPANY_NAME_STORAGE_KEY) { 
               setCompanyNameInput(DEFAULT_COMPANY_NAME);
               setCurrentCompanyName(DEFAULT_COMPANY_NAME);
               if (document) document.title = DEFAULT_COMPANY_NAME;
          }
           if (key === GOOGLE_AI_API_KEY_STORAGE_KEY) {
               setGoogleApiKey("");
               setOriginalGoogleApiKey("");
          }
          if (key === INVOICE_CONFIG_KEY) {
              const defaultConfig = { prefix: DEFAULT_INVOICE_PREFIX, dailyCounters: {} };
              saveToLocalStorage(INVOICE_CONFIG_KEY, defaultConfig);
              setInvoicePrefix(defaultConfig.prefix);
              setOriginalInvoicePrefix(defaultConfig.prefix);
          }
           if (key === THEME_STORAGE_KEY) {
              handleThemeChange(DEFAULT_THEME_KEY); 
          }
          if (key === CUSTOM_THEME_STORAGE_KEY) {
              setCustomThemeValues(DEFAULT_CUSTOM_THEME_VALUES);
              setOriginalCustomThemeValues(DEFAULT_CUSTOM_THEME_VALUES);
              saveToLocalStorage(CUSTOM_THEME_STORAGE_KEY, DEFAULT_CUSTOM_THEME_VALUES); 
          }
           if (key === LAST_BACKUP_TIMESTAMP_KEY) {
              setLastBackupTimestamp(null);
          }
        });
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
      description: "Google AI API Key has been saved to local storage. Restart server for changes to take effect.",
    });
  };

  const handleSaveCompanyName = () => {
    if (!companyNameInput.trim()) {
      toast({
        title: "Company Name Empty",
        description: "Please enter a company name.",
        variant: "destructive",
      });
      return;
    }
    saveToLocalStorage(COMPANY_NAME_STORAGE_KEY, companyNameInput);
    setCurrentCompanyName(companyNameInput);
    if (document) { 
        document.title = companyNameInput;
    }
    toast({
      title: "Company Name Saved",
      description: `Company name updated to ${companyNameInput}.`,
    });
  };

  const handleThemeChange = useCallback((themeKey: string) => {
    if (AVAILABLE_THEMES[themeKey as keyof typeof AVAILABLE_THEMES]) {
      const htmlElement = document.documentElement;
      htmlElement.setAttribute('data-theme', themeKey);
      localStorage.setItem(THEME_STORAGE_KEY, themeKey); 
      setSelectedThemeKey(themeKey);
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
       // Trigger layout.tsx's storage event listener or its own effect
       window.dispatchEvent(new StorageEvent('storage', { key: CUSTOM_THEME_STORAGE_KEY }));
    }
  };

  const dataManagementActions = [
    { id: "clearSales", label: "Clear Sales Data (Invoices)", description: "Permanently delete all sales records (invoices) from local storage.", key: INVOICES_STORAGE_KEY },
    { id: "clearCustomers", label: "Clear Customer Data", description: "Permanently delete all customer information from local storage.", key: CUSTOMERS_STORAGE_KEY },
    { id: "clearProducts", label: "Clear Product Data", description: "Permanently delete all product information from local storage.", key: PRODUCTS_STORAGE_KEY },
    { id: "factoryReset", label: "Factory Reset", description: "Reset all application data, settings, API key, company name, and themes to default.", key: [INVOICES_STORAGE_KEY, CUSTOMERS_STORAGE_KEY, PRODUCTS_STORAGE_KEY, INVOICE_CONFIG_KEY, GOOGLE_AI_API_KEY_STORAGE_KEY, THEME_STORAGE_KEY, COMPANY_NAME_STORAGE_KEY, CUSTOM_THEME_STORAGE_KEY, LAST_BACKUP_TIMESTAMP_KEY] },
  ];

  // --- Import/Export Logic ---
  const downloadJSON = (data: any, filename: string) => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = filename;
    link.click();
    link.remove();
  };

  const createExportData = (dataType: 'customers' | 'products' | 'invoices' | 'all'): any => {
    switch (dataType) {
      case 'customers':
        return loadFromLocalStorage(CUSTOMERS_STORAGE_KEY, []);
      case 'products':
        return loadFromLocalStorage(PRODUCTS_STORAGE_KEY, []);
      case 'invoices':
        return loadFromLocalStorage(INVOICES_STORAGE_KEY, []);
      case 'all':
        const allData: AllApplicationData = {
          [CUSTOMERS_STORAGE_KEY]: loadFromLocalStorage(CUSTOMERS_STORAGE_KEY, []),
          [PRODUCTS_STORAGE_KEY]: loadFromLocalStorage(PRODUCTS_STORAGE_KEY, []),
          [INVOICES_STORAGE_KEY]: loadFromLocalStorage(INVOICES_STORAGE_KEY, []),
          [INVOICE_CONFIG_KEY]: loadFromLocalStorage(INVOICE_CONFIG_KEY, { prefix: DEFAULT_INVOICE_PREFIX, dailyCounters: {} }),
          [GOOGLE_AI_API_KEY_STORAGE_KEY]: loadFromLocalStorage(GOOGLE_AI_API_KEY_STORAGE_KEY, ""),
          [COMPANY_NAME_STORAGE_KEY]: loadFromLocalStorage(COMPANY_NAME_STORAGE_KEY, DEFAULT_COMPANY_NAME),
          appThemeKey: localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME_KEY,
          [CUSTOM_THEME_STORAGE_KEY]: loadFromLocalStorage(CUSTOM_THEME_STORAGE_KEY, DEFAULT_CUSTOM_THEME_VALUES),
          [LAST_BACKUP_TIMESTAMP_KEY]: loadFromLocalStorage(LAST_BACKUP_TIMESTAMP_KEY, null),
          appVersion: "1.0.0" // Example version
        };
        return allData;
      default:
        return {};
    }
  };

  const handleExportClick = (dataType: 'customers' | 'products' | 'invoices' | 'all') => {
    const data = createExportData(dataType);
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const filename = `${dataType}_export_${dateStr}.json`;
    downloadJSON(data, filename);
    toast({ title: "Export Successful", description: `${filename} has been downloaded.` });
  };

  const handleCreateBackupClick = () => {
    const data = createExportData('all');
    const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const filename = `app_backup_${dateStr}.json`;
    downloadJSON(data, filename);
    const timestamp = Date.now();
    saveToLocalStorage(LAST_BACKUP_TIMESTAMP_KEY, timestamp);
    setLastBackupTimestamp(timestamp);
    toast({ title: "Manual Backup Created", description: `${filename} has been downloaded.` });
  };

  const handleImportFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const importedData = JSON.parse(text) as AllApplicationData;

        // Validate and apply data
        if (importedData[CUSTOMERS_STORAGE_KEY]) saveToLocalStorage(CUSTOMERS_STORAGE_KEY, importedData[CUSTOMERS_STORAGE_KEY]);
        if (importedData[PRODUCTS_STORAGE_KEY]) saveToLocalStorage(PRODUCTS_STORAGE_KEY, importedData[PRODUCTS_STORAGE_KEY]);
        if (importedData[INVOICES_STORAGE_KEY]) saveToLocalStorage(INVOICES_STORAGE_KEY, importedData[INVOICES_STORAGE_KEY]);
        if (importedData[INVOICE_CONFIG_KEY]) saveToLocalStorage(INVOICE_CONFIG_KEY, importedData[INVOICE_CONFIG_KEY]);
        if (importedData[GOOGLE_AI_API_KEY_STORAGE_KEY] !== undefined) saveToLocalStorage(GOOGLE_AI_API_KEY_STORAGE_KEY, importedData[GOOGLE_AI_API_KEY_STORAGE_KEY]);
        if (importedData[COMPANY_NAME_STORAGE_KEY]) saveToLocalStorage(COMPANY_NAME_STORAGE_KEY, importedData[COMPANY_NAME_STORAGE_KEY]);
        if (importedData.appThemeKey) {
            localStorage.setItem(THEME_STORAGE_KEY, importedData.appThemeKey); // Directly set to localStorage
        }
        if (importedData[CUSTOM_THEME_STORAGE_KEY]) saveToLocalStorage(CUSTOM_THEME_STORAGE_KEY, importedData[CUSTOM_THEME_STORAGE_KEY]);
        if (importedData[LAST_BACKUP_TIMESTAMP_KEY]) saveToLocalStorage(LAST_BACKUP_TIMESTAMP_KEY, importedData[LAST_BACKUP_TIMESTAMP_KEY]);
        
        toast({ title: "Import Successful", description: "Application data and settings have been imported. Please reload the page to apply all changes." });
        // Consider forcing a reload: window.location.reload();
        // For now, prompt user or rely on individual component re-renders where possible.
        // Re-fetch initial values after import:
        setTimeout(() => window.location.reload(), 1000);


      } catch (err) {
        console.error("Import error:", err);
        toast({ title: "Import Failed", description: "The selected file is not valid JSON or has an incorrect format.", variant: "destructive" });
      } finally {
        // Reset file input
        if (importFileRef.current) {
          importFileRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  };


  return (
    <div className="space-y-6">
      <PageHeader 
        title="Settings" 
        description="Manage your application settings and preferences." 
        icon={<SettingsIcon className="h-6 w-6" />}
      />

      <Tabs defaultValue="appearance" className="space-y-4">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">Company</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileCog className="h-4 w-4" />
            <span className="hidden sm:inline">Invoices</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">AI Settings</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <DatabaseZap className="h-4 w-4" />
            <span className="hidden sm:inline">Data</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Theme Settings</CardTitle>
                <CardDescription>
                  Customize the look and feel of the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <RadioGroup
                    value={selectedThemeKey}
                    onValueChange={handleThemeChange}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
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
                            "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer",
                            selectedThemeKey === key ? "border-primary" : "border-muted"
                          )}
                        >
                          <div className="mb-2 h-5 w-5 rounded-full border" style={{
                            background: key === 'custom' 
                              ? `hsl(${customThemeValues.primary || '180 60% 45%'})`
                              : `var(--color-${key}-primary, var(--primary))`
                          }} />
                          <div className="font-medium">{name}</div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {selectedThemeKey === 'custom' && (
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium">Custom Theme Properties</h4>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="primary-color">Primary Color (HSL)</Label>
                      <Input
                        id="primary-color"
                        placeholder="180 60% 45%"
                        value={customThemeValues.primary || ''}
                        onChange={(e) => setCustomThemeValues(prev => ({ ...prev, primary: e.target.value }))}
                      />
                      <p className="text-sm text-muted-foreground">Format: hue saturation% lightness%</p>
                    </div>
                    
                    <Button onClick={handleSaveCustomTheme} className="w-full mt-2">
                      <Save className="w-4 h-4 mr-2" />
                      Save Custom Theme
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Add Font Settings Card */}
            <FontSettings />
          </div>
        </TabsContent>

        <TabsContent value="company" className="space-y-6">
          <CompanySettingsForm 
            defaultValues={companyInfo} 
            onSuccess={() => {
              getCompanyInfo().then(info => setCompanyInfo(info));
            }} 
          />
          
          <Card>
            <CardHeader>
              <CardTitle>Application Name</CardTitle>
              <CardDescription>Update the name displayed in the browser tab and application title</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Application Title</Label>
                  <div className="flex w-full items-center gap-2">
                    <Input
                      id="companyName"
                      placeholder="Enter your company name"
                      value={companyNameInput}
                      onChange={(e) => setCompanyNameInput(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleSaveCompanyName} size="sm">
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

        <TabsContent value="invoices" className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileCog className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle className="text-xl">Invoice Settings</CardTitle>
                  <CardDescription>Configure invoice numbering.</CardDescription>
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
                <Label htmlFor="googleApiKey">Google AI API Key</Label>
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
                  <strong>Important:</strong> For the AI features to use your saved key:
                </p>
                <ol className="list-decimal list-inside pl-4 space-y-1 text-muted-foreground">
                  <li>Save your API key using the button above (or clear it if you intend to remove it).</li>
                  <li>Create or open the <code className="bg-secondary px-1 py-0.5 rounded text-foreground">.env</code> file in the root of this project.</li>
                  <li>Add (or modify/remove): <pre className="mt-1 p-2 bg-card rounded text-xs overflow-x-auto">GOOGLE_API_KEY=YOUR_API_KEY_HERE</pre>If clearing, you can remove this line or set it to empty: <code className="bg-secondary px-1 py-0.5 rounded text-foreground">GOOGLE_API_KEY=</code></li>
                  <li><strong>Restart your development server</strong> (both <code className="bg-secondary px-1 py-0.5 rounded text-foreground">npm run dev</code> and <code className="bg-secondary px-1 py-0.5 rounded text-foreground">npm run genkit:dev</code> if it's running).</li>
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
                  <CardTitle className="text-xl">Import/Export Data & Backup</CardTitle>
                  <CardDescription>Manage your application data. Exports are in JSON format.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2 text-md">Export Data</h4>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  <Button variant="outline" onClick={() => handleExportClick('customers')}>
                    <Download className="mr-2 h-4 w-4" /> Customers
                  </Button>
                  <Button variant="outline" onClick={() => handleExportClick('products')}>
                    <Download className="mr-2 h-4 w-4" /> Products
                  </Button>
                  <Button variant="outline" onClick={() => handleExportClick('invoices')}>
                    <Download className="mr-2 h-4 w-4" /> Invoices
                  </Button>
                  <Button variant="outline" onClick={() => handleExportClick('all')}>
                    <Download className="mr-2 h-4 w-4" /> All Data
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-md">Import Data</h4>
                <div className="flex items-center gap-2">
                  <Input 
                    id="importFile" 
                    type="file" 
                    accept=".json" 
                    ref={importFileRef}
                    className="flex-grow max-w-xs"
                    onChange={handleImportFileSelected}
                  />
                  {/* The button is implicit through the onChange of the file input */}
                </div>
                 <p className="text-xs text-muted-foreground mt-1">Import an "All Application Data" JSON file. This will overwrite existing data and settings.</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 text-md">Manual Backup</h4>
                 <Button variant="default" onClick={handleCreateBackupClick}>
                    <Archive className="mr-2 h-4 w-4" /> Create Manual Backup
                  </Button>
                {lastBackupTimestamp && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last backup created: {format(new Date(lastBackupTimestamp), "PPP p")}
                  </p>
                )}
                {!lastBackupTimestamp && (
                    <p className="text-xs text-muted-foreground mt-1">No manual backups created yet.</p>
                )}
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
