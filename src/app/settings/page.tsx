
"use client";

import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, DatabaseZap, UsersRound, Brain, Sparkles, Trash2, Settings2 as SettingsIcon, Save, KeyRound, ExternalLink, Palette, Building, FileCog, ShieldCheck } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { 
  loadFromLocalStorage, 
  saveToLocalStorage, 
  INVOICE_CONFIG_KEY, 
  DEFAULT_INVOICE_PREFIX, 
  type InvoiceConfig, 
  GOOGLE_AI_API_KEY_STORAGE_KEY,
  COMPANY_NAME_STORAGE_KEY,
  DEFAULT_COMPANY_NAME 
} from "@/lib/localStorage";
import { THEME_STORAGE_KEY, AVAILABLE_THEMES, DEFAULT_THEME_KEY } from "@/app/layout"; 
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Link from "next/link";
import { format } from "date-fns"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils"; // Added missing import

const CUSTOMERS_KEY = "app_customers";
const PRODUCTS_KEY = "app_products";
const INVOICES_KEY = "app_invoices";


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

    // Client-side only date formatting for example
    setExampleInvoiceDateString(format(new Date(), 'ddMMyyyy'));

  }, []);

  const handleDataAction = (actionName: string, storageKey?: string | string[]) => {
    if (typeof window !== 'undefined') {
      if (storageKey) {
        if (Array.isArray(storageKey)) {
          storageKey.forEach(key => {
            localStorage.removeItem(key);
            if (key === COMPANY_NAME_STORAGE_KEY) { // Reset company name on factory reset
                 setCompanyNameInput(DEFAULT_COMPANY_NAME);
                 setCurrentCompanyName(DEFAULT_COMPANY_NAME);
                 // Also update document title immediately if possible
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
                handleThemeChange(DEFAULT_THEME_KEY); // Reset theme to default
            }

          });
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
    // Special handling for factory reset to ensure all states are reset
    if (actionName === "Factory Reset") {
        // States already handled inside the loop for specific keys.
        // Trigger a reload to ensure all components pick up default states if necessary, especially layout.
        // window.location.reload(); // Consider if a full reload is desired or just state resets.
        // For now, individual state resets are done above.
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
        setInvoicePrefix(originalInvoicePrefix); // Revert to original if invalid attempt
        return;
    }
    if (newPrefix.length === 0 && invoicePrefix.length === 0) { // Allow empty to reset to default (implicitly)
      newPrefix = DEFAULT_INVOICE_PREFIX;
    } else if (newPrefix.length < 3) {
       toast({title: "Prefix Too Short", description: "Invoice prefix must be 3 letters.", variant: "destructive"});
       setInvoicePrefix(originalInvoicePrefix); // Revert
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
      // Allow clearing the API key
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
    if (document) { // Update title immediately
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


  const dataManagementActions = [
    { id: "clearSales", label: "Clear Sales Data (Invoices)", description: "Permanently delete all sales records (invoices) from local storage.", key: INVOICES_KEY },
    { id: "clearCustomers", label: "Clear Customer Data", description: "Permanently delete all customer information from local storage.", key: CUSTOMERS_KEY },
    { id: "clearProducts", label: "Clear Product Data", description: "Permanently delete all product information from local storage.", key: PRODUCTS_KEY },
    { id: "factoryReset", label: "Factory Reset", description: "Reset all application data, invoice settings, API key, company name and theme to default.", key: [INVOICES_KEY, CUSTOMERS_KEY, PRODUCTS_KEY, INVOICE_CONFIG_KEY, GOOGLE_AI_API_KEY_STORAGE_KEY, THEME_STORAGE_KEY, COMPANY_NAME_STORAGE_KEY] },
  ];


  return (
    <div className="space-y-8">
      <PageHeader title="Application Settings" description="Manage your application configurations and preferences." />

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 mb-6">
          <TabsTrigger value="general">
            <SettingsIcon className="mr-2 h-4 w-4" /> General
          </TabsTrigger>
          <TabsTrigger value="invoice-ai">
            <FileCog className="mr-2 h-4 w-4" /> Invoice & AI
          </TabsTrigger>
          <TabsTrigger value="data-security">
            <ShieldCheck className="mr-2 h-4 w-4" /> Data & Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Building className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle className="text-xl">Company Settings</CardTitle>
                  <CardDescription>Set your company name that appears in the application.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyNameInput">Company Name</Label>
                <div className="flex gap-2 items-center flex-wrap">
                    <Input 
                        id="companyNameInput" 
                        value={companyNameInput} 
                        onChange={(e) => setCompanyNameInput(e.target.value)}
                        className="max-w-xs flex-grow"
                        placeholder="Your Company Name"
                    />
                    <Button onClick={handleSaveCompanyName} disabled={companyNameInput === currentCompanyName || companyNameInput.trim() === ""}>
                        <Save className="mr-2 h-4 w-4" /> Save Name
                    </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Palette className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle className="text-xl">Theme Settings</CardTitle>
                  <CardDescription>Choose your preferred application theme.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedThemeKey} onValueChange={handleThemeChange} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Object.entries(AVAILABLE_THEMES).map(([key, name]) => (
                  <Label 
                    key={key} 
                    htmlFor={`theme-${key}`} 
                    className={cn(
                      "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer min-h-[100px]",
                      selectedThemeKey === key && "border-primary ring-2 ring-primary"
                    )}
                  >
                    <RadioGroupItem value={key} id={`theme-${key}`} className="sr-only" />
                    <div className="w-full h-10 rounded mb-2 relative overflow-hidden" 
                         style={{ 
                            backgroundColor: `hsl(var(--${key}-background, var(--background)))`, // Fallback to current bg
                            border: `2px solid hsl(var(--${key}-primary, var(--primary)))` // Fallback to current primary
                         }}
                         data-theme-preview={key} // For potential CSS targeting
                    >
                        {/* Simplified visual cue for sidebar and header */}
                        <div className="absolute left-0 top-0 h-full w-1/3" style={{backgroundColor: `hsl(var(--${key}-sidebar-background, var(--sidebar-background)))`}}></div>
                        <div className="absolute right-0 top-0 h-1/4 w-2/3" style={{backgroundColor: `hsl(var(--${key}-header-background, var(--header-background)))`}}></div>
                     </div>
                    <span className="text-sm font-medium text-center">{name}</span>
                  </Label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoice-ai" className="space-y-6">
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
        
        <TabsContent value="data-security" className="space-y-6">
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

