
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { CalendarIcon, PlusCircle, Trash2, Wand2, Loader2, X, Check, ArrowLeft, HelpCircle, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format as formatDateFns, isValid, addDays } from "date-fns";
import { useState, useEffect, useMemo } from "react";
import { suggestGstCategory, type GstSuggestionOutput } from "@/ai/flows/gst-suggestion";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { loadFromLocalStorage, saveToLocalStorage, INVOICE_CONFIG_KEY, DEFAULT_INVOICE_PREFIX, type InvoiceConfig } from "@/lib/localStorage";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { Product } from "@/app/products/page";
import type { Customer } from "@/app/customers/page";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const invoiceItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  description: z.string().optional(),
  quantity: z.coerce.number().min(0.01, "Quantity must be positive"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  gstCategory: z.string().optional(),
  applyIgst: z.boolean().default(true),
  applyCgst: z.boolean().default(false),
  applySgst: z.boolean().default(false),
  igstRate: z.coerce.number().min(0).default(18),
  cgstRate: z.coerce.number().min(0).default(9),
  sgstRate: z.coerce.number().min(0).default(9),
});

const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer selection is required."),
  customerName: z.string().min(1, "Customer name is required (auto-filled on selection)."),
  customerEmail: z.string().email("Invalid email address (auto-filled on selection).").optional().or(z.literal('')),
  customerAddress: z.string().optional(),
  invoiceNumber: z.string().min(1, "Invoice number is required."),
  invoiceDate: z.date({ required_error: "Invoice date is required." }),
  dueDate: z.date().optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required."),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  paymentStatus: z.enum(["Paid", "Unpaid", "Partially Paid"]).default("Unpaid"),
  paymentMethod: z.string().optional(),
  shipmentDetails: z.object({
    shipDate: z.date().optional().nullable(),
    trackingNumber: z.string().optional(),
    carrierName: z.string().optional(),
    consigneeName: z.string().optional(),
    consigneeAddress: z.string().optional(),
    consigneeGstin: z.string().optional(),
    consigneeStateCode: z.string().optional(),
    transportationMode: z.string().optional(),
    lrNo: z.string().optional(),
    vehicleNo: z.string().optional(),
    dateOfSupply: z.date().optional().nullable(),
    placeOfSupply: z.string().optional(),
  }).optional().default({
    shipDate: null, trackingNumber: "", carrierName: "", consigneeName: "", consigneeAddress: "",
    consigneeGstin: "", consigneeStateCode: "", transportationMode: "", lrNo: "", vehicleNo: "",
    dateOfSupply: null, placeOfSupply: ""
  }),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  onSubmit: (data: InvoiceFormValues) => void;
  defaultValues?: Partial<InvoiceFormValues>;
  isLoading?: boolean;
  onCancel?: () => void;
}

export function generateInvoiceNumber(invoiceDate: Date, increment: boolean = false): string {
  if (typeof window === 'undefined') {
    const prefix = DEFAULT_INVOICE_PREFIX.substring(0,3).toUpperCase();
    const dateKey = formatDateFns(invoiceDate, "ddMMyyyy");
    const sequentialNumber = "0001";
    return `${prefix}${dateKey}${sequentialNumber}`;
  }

  const config = loadFromLocalStorage<InvoiceConfig>(INVOICE_CONFIG_KEY, {
    prefix: DEFAULT_INVOICE_PREFIX,
    dailyCounters: {},
  });

  const prefix = (config.prefix || DEFAULT_INVOICE_PREFIX).substring(0,3).toUpperCase();
  const dateKey = formatDateFns(invoiceDate, "ddMMyyyy");

  let currentCounter = config.dailyCounters[dateKey] || 0;
  const nextCounter = increment ? currentCounter + 1 : currentCounter; 

  if (increment) {
    config.dailyCounters[dateKey] = nextCounter;
    saveToLocalStorage(INVOICE_CONFIG_KEY, config);
  }
  
  const useCounter = increment ? nextCounter : (currentCounter === 0 ? 1 : currentCounter + 1);


  const sequentialNumber = String(useCounter).padStart(4, '0');

  return `${prefix}${dateKey}${sequentialNumber}`;
}

export function InvoiceForm({ onSubmit, defaultValues: defaultValuesProp, isLoading: formSubmitLoading, onCancel }: InvoiceFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isCustomerSelected, setIsCustomerSelected] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [gstSuggestions, setGstSuggestions] = useState<(GstSuggestionOutput | null)[]>([]);
  const [loadingGst, setLoadingGst] = useState<boolean[]>([]);

  const [isCustomerPopoverOpen, setIsCustomerPopoverOpen] = useState(false);
  const [productPopoversOpen, setProductPopoversOpen] = useState<boolean[]>([]);
  
  const [showDueDate, setShowDueDate] = useState(!!defaultValuesProp?.dueDate);
  const [applyRoundOff, setApplyRoundOff] = useState(false);


  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {}, 
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    setProductPopoversOpen(fields.map(() => false));
  }, [fields.length]);


  useEffect(() => {
    let initialInvoiceDate: Date | null = null;
    let initialDueDate: Date | null = null;
    let isCreatingNew = true;

    if (typeof window !== 'undefined') {
      isCreatingNew = !defaultValuesProp || !defaultValuesProp.invoiceNumber;
      initialInvoiceDate = defaultValuesProp?.invoiceDate ? new Date(defaultValuesProp.invoiceDate) : (isCreatingNew ? new Date() : new Date());
      if (defaultValuesProp?.dueDate) {
        initialDueDate = new Date(defaultValuesProp.dueDate);
        setShowDueDate(true);
      } else {
        setShowDueDate(isCreatingNew ? false : !!defaultValuesProp?.dueDate); // Show if editing with existing due date
        initialDueDate = null;
      }
    }
    
    const initialInvoiceNumber = isCreatingNew && initialInvoiceDate && typeof window !== 'undefined'
        ? generateInvoiceNumber(initialInvoiceDate, false) 
        : defaultValuesProp?.invoiceNumber || '';

    form.reset({
      ...defaultValuesProp,
      invoiceDate: initialInvoiceDate || new Date(),
      dueDate: initialDueDate, 
      invoiceNumber: initialInvoiceNumber,
      items: defaultValuesProp?.items?.length ? defaultValuesProp.items.map(item => ({
        ...item,
        quantity: Number(item.quantity || 1),
        price: Number(item.price || 0),
        igstRate: Number(item.igstRate || 18),
        cgstRate: Number(item.cgstRate || 9),
        sgstRate: Number(item.sgstRate || 9),
      })) : [{
        productId: "", description: "", quantity: 1, price: 0, gstCategory: "",
        applyIgst: true, applyCgst: false, applySgst: false,
        igstRate: 18, cgstRate: 9, sgstRate: 9
      }],
      shipmentDetails: defaultValuesProp?.shipmentDetails || {
        shipDate: null, trackingNumber: "", carrierName: "", consigneeName: "", consigneeAddress: "",
        consigneeGstin: "", consigneeStateCode: "", transportationMode: "", lrNo: "", vehicleNo: "",
        dateOfSupply: null, placeOfSupply: ""
      },
      customerId: defaultValuesProp?.customerId || "",
      customerName: defaultValuesProp?.customerName || "",
      customerEmail: defaultValuesProp?.customerEmail || "",
      customerAddress: defaultValuesProp?.customerAddress || "",
      paymentStatus: defaultValuesProp?.paymentStatus || "Unpaid",
      paymentMethod: defaultValuesProp?.paymentMethod || "",
    });

    if (defaultValuesProp?.customerId) {
      setIsCustomerSelected(true);
    } else {
      setIsCustomerSelected(false);
    }

    async function loadInitialData() {
      setIsDataLoading(true);
      if (window.electronAPI) {
        try {
          const [fetchedCustomers, fetchedProducts] = await Promise.all([
            window.electronAPI.getAllCustomers(),
            window.electronAPI.getAllProducts()
          ]);
          setCustomers(fetchedCustomers || []);
          setProducts(fetchedProducts || []);
        } catch (error) {
          console.error("Error fetching initial data for invoice form:", error);
          toast({ title: "Error", description: "Could not load customers/products.", variant: "destructive" });
          setCustomers([]); 
          setProducts([]);  
        } finally {
            setIsDataLoading(false);
        }
      } else {
         console.warn("Electron API not available for invoice form data loading.");
         setIsDataLoading(false);
         setCustomers([]); 
         setProducts([]);  
      }
    }

    if (typeof window !== 'undefined') { 
        loadInitialData();
    }

  }, [defaultValuesProp, form, toast]);


  useEffect(() => {
    setGstSuggestions(new Array(fields.length).fill(null));
    setLoadingGst(new Array(fields.length).fill(false));
  }, [fields.length]);

  const handleSuggestGst = async (index: number) => {
    const itemDescription = form.getValues(`items.${index}.description`);
    if (!itemDescription || itemDescription.trim() === "") {
      toast({ title: "Missing Description", description: "Please enter an item description to get tax category suggestions.", variant: "destructive" });
      return;
    }

    setLoadingGst(prev => { const newLoading = [...prev]; newLoading[index] = true; return newLoading; });
    try {
      const suggestion = await suggestGstCategory({ itemDescription });
      setGstSuggestions(prev => { const newSuggestions = [...prev]; newSuggestions[index] = suggestion; return newSuggestions; });
      form.setValue(`items.${index}.gstCategory`, suggestion.gstCategory);
      toast({ title: "Tax Category Suggestion", description: `Suggested: ${suggestion.gstCategory} (Confidence: ${(suggestion.confidence * 100).toFixed(0)}%)` });
    } catch (error) {
      console.error("Error fetching tax category suggestion:", error);
      toast({ title: "Error", description: "Could not fetch tax category suggestion.", variant: "destructive" });
    } finally {
      setLoadingGst(prev => { const newLoading = [...prev]; newLoading[index] = false; return newLoading; });
    }
  };

  const handleSelectProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      form.setValue(`items.${index}.productId`, product.id);
      form.setValue(`items.${index}.description`, product.description || product.name);
      form.setValue(`items.${index}.price`, product.price);
      form.setValue(`items.${index}.gstCategory`, product.gstCategory || "");
      form.setValue(`items.${index}.igstRate`, Number(product.igstRate || 18));
      form.setValue(`items.${index}.cgstRate`, Number(product.cgstRate || 9));
      form.setValue(`items.${index}.sgstRate`, Number(product.sgstRate || 9));
      form.setValue(`items.${index}.applyIgst`, true); 
      form.setValue(`items.${index}.applyCgst`, false);
      form.setValue(`items.${index}.applySgst`, false);
      form.trigger(`items.${index}`); 
      setProductPopoversOpen(prev => { const newState = [...prev]; newState[index] = false; return newState; });
    }
  };

  const handleToggleGstType = (index: number, type: 'igst' | 'cgstSgst', value: boolean) => {
    if (type === 'igst') {
      form.setValue(`items.${index}.applyIgst`, value);
      if (value) { 
        form.setValue(`items.${index}.applyCgst`, false);
        form.setValue(`items.${index}.applySgst`, false);
      }
    } else if (type === 'cgstSgst') { 
      form.setValue(`items.${index}.applyCgst`, value);
      form.setValue(`items.${index}.applySgst`, value);
      if (value) { 
        form.setValue(`items.${index}.applyIgst`, false);
      }
    }
  
    const { applyIgst, applyCgst, applySgst } = form.getValues(`items.${index}`);
    if (!applyIgst && !applyCgst && !applySgst) {
      form.setValue(`items.${index}.applyIgst`, true);
    }
  };

  const handleSelectCustomer = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      form.setValue("customerId", customer.id, { shouldValidate: true });
      form.setValue("customerName", customer.name, { shouldValidate: true });
      form.setValue("customerEmail", customer.email || "", { shouldValidate: true });
      form.setValue("customerAddress", customer.address || "", { shouldValidate: true });
      form.setValue("shipmentDetails.consigneeName", customer.name, { shouldValidate: true });
      form.setValue("shipmentDetails.consigneeAddress", customer.address || "", { shouldValidate: true }); 
      setIsCustomerSelected(true);
      setIsCustomerPopoverOpen(false); 
    } else {
      setIsCustomerSelected(false);
    }
  };

  const watchItems = form.watch("items");
  const watchInvoiceDate = form.watch("invoiceDate");

  const { subtotal, cgstAmount, sgstAmount, igstAmount, total, roundOffDifference, finalTotal } = useMemo(() => {
    const currentItems = form.getValues("items") || [];
    const sub = currentItems.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0);

    let cgst = 0; let sgst = 0; let igst = 0;

    currentItems.forEach(item => {
      const itemAmount = (Number(item.quantity) || 0) * (Number(item.price) || 0);
      if (item.applyIgst) igst += itemAmount * ((Number(item.igstRate) || 0) / 100);
      if (item.applyCgst) cgst += itemAmount * ((Number(item.cgstRate) || 0) / 100);
      if (item.applySgst) sgst += itemAmount * ((Number(item.sgstRate) || 0) / 100);
    });

    const grandTotal = sub + cgst + sgst + igst;
    let calculatedFinalTotal = grandTotal;
    let diff = 0;

    if (applyRoundOff) {
      calculatedFinalTotal = Math.round(grandTotal);
      diff = calculatedFinalTotal - grandTotal;
    }

    return {
      subtotal: sub, cgstAmount: cgst, sgstAmount: sgst, igstAmount: igst,
      total: grandTotal, roundOffDifference: diff, finalTotal: calculatedFinalTotal
    };
  }, [watchItems, form, applyRoundOff]);

  const handleCancel = () => {
    if (onCancel) onCancel();
    else router.back();
  };

  const handleFormSubmit = (data: InvoiceFormValues) => {
    let submissionData = { ...data };
    if (!showDueDate) {
      submissionData.dueDate = null;
    }
    if (typeof window !== 'undefined' && (!defaultValuesProp?.invoiceNumber || defaultValuesProp.invoiceNumber === "")) {
        const invoiceDateForNumber = data.invoiceDate instanceof Date ? data.invoiceDate : new Date(data.invoiceDate);
        if (isValid(invoiceDateForNumber)) {
            const confirmedInvoiceNumber = generateInvoiceNumber(invoiceDateForNumber, true);
            submissionData.invoiceNumber = confirmedInvoiceNumber;
        } else {
            toast({ title: "Error", description: "Invalid invoice date provided.", variant: "destructive" });
            return; 
        }
    }
    onSubmit(submissionData);
  };

  useEffect(() => {
    if (showDueDate && !form.getValues("dueDate") && watchInvoiceDate && typeof window !== 'undefined') {
      form.setValue("dueDate", addDays(new Date(watchInvoiceDate), 30));
    } else if (!showDueDate) {
      form.setValue("dueDate", null);
    }
  }, [showDueDate, watchInvoiceDate, form]);


  if (isDataLoading && typeof window !== 'undefined') { 
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading form data...</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Customer Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Select Customer *</FormLabel>
                    {isDataLoading && customers.length === 0 ? (
                      <div className="flex items-center justify-center p-4 border rounded-md h-[40px]">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : !isDataLoading && customers.length === 0 ? (
                       <div className="p-4 text-sm border rounded-md bg-muted/50 text-muted-foreground">
                         No customers found. Please
                         <Button variant="link" asChild className="px-1 py-0 h-auto"><Link href="/customers">add a customer</Link></Button>
                         first.
                       </div>
                    ) : (
                      <Popover open={isCustomerPopoverOpen} onOpenChange={setIsCustomerPopoverOpen}>
                        <FormControl>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn( "w-full justify-between", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? customers.find( (customer) => customer && customer.id === field.value )?.name || "Select customer..." : "Select customer..."}
                              <UserPlus className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                        </FormControl>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search customers..." />
                            <CommandList>
                              <CommandEmpty>
                                <div className="py-2 text-center text-sm"> No customer found.
                                  <Button variant="link" size="sm" asChild className="px-1">
                                    <Link href="/customers">Add New Customer</Link>
                                  </Button>
                                </div>
                              </CommandEmpty>
                              <CommandGroup>
                                {customers.filter(customer => !!customer).map((customer) => (
                                  <CommandItem
                                    key={customer.id}
                                    value={customer.name} 
                                    onSelect={() => handleSelectCustomer(customer.id)}
                                  >
                                    <Check className={cn( "mr-2 h-4 w-4", customer.id === field.value ? "opacity-100" : "opacity-0")} />
                                    {customer.name} ({customer.id})
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="customerName" render={({ field }) => (
                <FormItem> <FormLabel>Customer Name</FormLabel> <FormControl><Input placeholder="Auto-filled" {...field} value={field.value || ''} readOnly={isCustomerSelected} className={cn(isCustomerSelected ? "bg-muted/50 cursor-not-allowed" : "")} /></FormControl> <FormMessage /> </FormItem>
              )} />
              <FormField control={form.control} name="customerEmail" render={({ field }) => (
                <FormItem> <FormLabel>Customer Email</FormLabel> <FormControl><Input placeholder="Auto-filled" {...field} value={field.value || ''} readOnly={isCustomerSelected} className={cn(isCustomerSelected ? "bg-muted/50 cursor-not-allowed" : "")}/></FormControl> <FormMessage /> </FormItem>
              )} />
              <FormField control={form.control} name="customerAddress" render={({ field }) => (
                <FormItem> <FormLabel>Billing Address</FormLabel> <FormControl><Textarea placeholder="Auto-filled" {...field} value={field.value || ''} readOnly={isCustomerSelected} className={cn(isCustomerSelected ? "bg-muted/50 cursor-not-allowed" : "")}/></FormControl> <FormMessage /> </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
                <FormItem> <FormLabel>Invoice Number *</FormLabel> <FormControl><Input placeholder="e.g. INVDDMMYYYY0001" {...field} value={field.value || ''} /></FormControl> <FormMessage /> </FormItem>
              )} />
              <FormField control={form.control} name="invoiceDate" render={({ field }) => (
                <FormItem className="flex flex-col"> <FormLabel>Invoice Date *</FormLabel>
                  <Popover> <PopoverTrigger asChild> <FormControl>
                        <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value && isValid(new Date(field.value)) ? formatDateFns(new Date(field.value), "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl> </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => {
                          field.onChange(date);
                           if (date && (!defaultValuesProp?.invoiceNumber || defaultValuesProp.invoiceNumber === "") && typeof window !== 'undefined') {
                            form.setValue( "invoiceNumber", generateInvoiceNumber(date, false), { shouldValidate: true });
                          }
                        }}
                        initialFocus disabled={(date) => date < new Date("1900-01-01")} />
                    </PopoverContent>
                  </Popover> <FormMessage />
                </FormItem>
              )} />
              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                <Checkbox id="addDueDate" checked={showDueDate} onCheckedChange={(checked) => setShowDueDate(checked as boolean)} />
                <Label htmlFor="addDueDate" className="font-normal text-sm cursor-pointer">Set Due Date</Label>
              </FormItem>
              {showDueDate && (
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem className="flex flex-col"> <FormLabel>Due Date</FormLabel>
                    <Popover> <PopoverTrigger asChild> <FormControl>
                          <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value && isValid(new Date(field.value)) ? formatDateFns(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl> </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} initialFocus disabled={(date) => date < new Date("1900-01-01")}/>
                      </PopoverContent>
                    </Popover> <FormMessage />
                  </FormItem>
                )} />
              )}
              <FormField control={form.control} name="paymentStatus" render={({ field }) => (
                <FormItem> <FormLabel>Payment Status</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-row space-x-2 pt-2" >
                      <FormItem className="flex items-center space-x-1 space-y-0"> <FormControl><RadioGroupItem value="Paid" /></FormControl> <Label className="font-normal">Paid</Label> </FormItem>
                      <FormItem className="flex items-center space-x-1 space-y-0"> <FormControl><RadioGroupItem value="Unpaid" /></FormControl> <Label className="font-normal">Unpaid</Label> </FormItem>
                      <FormItem className="flex items-center space-x-1 space-y-0"> <FormControl><RadioGroupItem value="Partially Paid" /></FormControl> <Label className="font-normal">Partially Paid</Label> </FormItem>
                    </RadioGroup>
                  </FormControl> <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                <FormItem> <FormLabel>Payment Method (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}> <FormControl>
                      <SelectTrigger> <SelectValue placeholder="Select payment method" /> </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem> <SelectItem value="Bank Transfer">Bank Transfer</SelectItem> <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem> <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select> <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Invoice Items *</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-4 items-start border p-4 rounded-md shadow-sm relative">
                   {fields.length > 1 && (
                     <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}
                       className="absolute top-1 right-1 h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label="Remove item" >
                       <X className="h-4 w-4" />
                     </Button>
                   )}
                  <div className="col-span-12 md:col-span-3">
                    <FormLabel>Product / Service *</FormLabel>
                     {isDataLoading && products.length === 0 ? (
                        <div className="flex items-center justify-center p-4 border rounded-md h-[40px] mt-1">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                     ) : !isDataLoading && products.length === 0 ? (
                       <div className="p-2 mt-1 text-xs border rounded-md bg-muted/50 text-muted-foreground"> No products.
                         <Button variant="link" asChild className="px-1 py-0 h-auto"><Link href="/products">Add product</Link></Button>
                       </div>
                    ) : (
                    <Popover open={productPopoversOpen[index]} onOpenChange={(isOpen) => setProductPopoversOpen(prev => { const newState = [...prev]; newState[index] = isOpen; return newState; })}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between mt-1">
                          {form.getValues(`items.${index}.productId`) ? products.find(p => p && p.id === form.getValues(`items.${index}.productId`))?.name || "Select..." : "Select product..." }
                          <PlusCircle className="ml-2 h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command> <CommandInput placeholder="Search products..." />
                           <CommandList>
                            <CommandEmpty>
                                <div className="py-2 text-center text-sm"> No product found.
                                  <Button variant="link" size="sm" asChild className="px-1">
                                    <Link href="/products"> Add New Product</Link>
                                  </Button>
                                </div>
                            </CommandEmpty>
                            <CommandGroup>
                              {products.filter(product => !!product).map((product) => (
                                <CommandItem 
                                  key={product.id} 
                                  value={product.name} 
                                  onSelect={() => handleSelectProduct(index, product.id)} 
                                >
                                  <Check className={cn( "mr-2 h-4 w-4", product.id === form.getValues(`items.${index}.productId`) ? "opacity-100" : "opacity-0")} />
                                  <div className="flex items-center">
                                    <Image src={product.imageUrl || "https://placehold.co/30x30.png"} alt={product.name} width={30} height={30}
                                      className="rounded-md mr-2 aspect-square object-cover" data-ai-hint="product item" onError={(e) => (e.currentTarget.src = "https://placehold.co/30x30.png?text=Error")}/>
                                    <span className="truncate">{product.name}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    )}
                     <FormField control={form.control} name={`items.${index}.productId`} render={() => <FormMessage />} /> 
                  </div>
                  <FormField control={form.control} name={`items.${index}.quantity`} render={({ field: itemField }) => (
                    <FormItem className="col-span-3 md:col-span-1"> <FormLabel>Qty *</FormLabel> <FormControl><Input type="number" placeholder="1" {...itemField} className="mt-1"/></FormControl> <FormMessage /> </FormItem>
                  )} />
                  <FormField control={form.control} name={`items.${index}.price`} render={({ field: itemField }) => (
                    <FormItem className="col-span-4 md:col-span-2"> <FormLabel>Price (₹) *</FormLabel> <FormControl><Input type="number" placeholder="0.00" {...itemField} className="mt-1"/></FormControl> <FormMessage /> </FormItem>
                  )} />
                  <FormField control={form.control} name={`items.${index}.gstCategory`} render={({ field: itemField }) => (
                    <FormItem className="col-span-6 md:col-span-3"> <FormLabel>Tax Category</FormLabel>
                      <div className="flex items-center gap-2 mt-1">
                        <FormControl><Input placeholder="e.g. HSN 1234" {...itemField} value={itemField.value || ''} /></FormControl>
                        <Button type="button" size="icon" variant="outline" onClick={() => handleSuggestGst(index)} disabled={loadingGst[index]} aria-label="Suggest Tax Category">
                          {loadingGst[index] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                        </Button>
                      </div> <FormMessage />
                    </FormItem>
                  )} />
                  <div className="col-span-6 md:col-span-3"> <FormLabel>GST Types</FormLabel>
                    <div className="flex flex-col gap-2 mt-2">
                       <Controller control={form.control} name={`items.${index}.applyIgst`}
                        render={({ field: igstField }) => (
                          <FormItem className="flex flex-row items-center space-x-2">
                            <Checkbox checked={igstField.value} onCheckedChange={(checked) => handleToggleGstType(index, 'igst', checked === true)} id={`items.${index}.applyIgst`} />
                            <div className="flex items-center gap-1">
                              <label htmlFor={`items.${index}.applyIgst`} className="text-sm font-medium leading-none cursor-pointer">IGST</label>
                              <Badge variant="outline">{form.getValues(`items.${index}.igstRate`)}%</Badge>
                              <TooltipProvider><Tooltip><TooltipTrigger asChild><HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent side="top"><p>Inter-state GST</p></TooltipContent></Tooltip></TooltipProvider>
                            </div>
                          </FormItem>
                        )} />
                      <div className="flex items-center gap-4">
                         <Controller control={form.control} name={`items.${index}.applyCgst`} 
                          render={({ field: cgstField }) => (
                            <FormItem className="flex flex-row items-center space-x-2">
                              <Checkbox checked={cgstField.value} onCheckedChange={(checked) => handleToggleGstType(index, 'cgstSgst', checked === true)} id={`items.${index}.applyCgstSgst`} />
                              <div className="flex items-center gap-1">
                                <label htmlFor={`items.${index}.applyCgstSgst`} className="text-sm font-medium leading-none cursor-pointer">CGST+SGST</label>
                                <Badge variant="outline">{form.getValues(`items.${index}.cgstRate`)}%+{form.getValues(`items.${index}.sgstRate`)}%</Badge>
                                <TooltipProvider><Tooltip><TooltipTrigger asChild><HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent side="top"><p>Intra-state GST (Central + State)</p></TooltipContent></Tooltip></TooltipProvider>
                              </div>
                            </FormItem>
                          )} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => append({
              productId: "", description: "", quantity: 1, price: 0, gstCategory: "",
              applyIgst: true, applyCgst: false, applySgst: false, igstRate: 18, cgstRate: 9, sgstRate: 9,
            })} className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col items-end gap-2">
            <div className="w-full max-w-xs space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span> <span>₹{subtotal.toFixed(2)}</span></div>
                {igstAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">IGST:</span> <span>₹{igstAmount.toFixed(2)}</span></div>}
                {cgstAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">CGST:</span> <span>₹{cgstAmount.toFixed(2)}</span></div>}
                {sgstAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">SGST:</span> <span>₹{sgstAmount.toFixed(2)}</span></div>}
                <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span >Total Before Round Off:</span> <span>₹{total.toFixed(2)}</span></div>
                {applyRoundOff && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Round Off Adjustment:</span>
                        <span>{roundOffDifference >= 0 ? '+' : ''}₹{roundOffDifference.toFixed(2)}</span>
                    </div>
                )}
                 <div className="flex justify-between font-bold text-lg border-t pt-1 mt-1"><span >Grand Total:</span> <span>₹{finalTotal.toFixed(2)}</span></div>
            </div>
            <div className="flex items-center space-x-2 self-end pt-2">
                <Switch id="round-off-switch" checked={applyRoundOff} onCheckedChange={setApplyRoundOff} />
                <Label htmlFor="round-off-switch" className="text-sm">Round Off Total</Label>
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader><CardTitle>Shipment & Transport Details (Optional)</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-md font-medium mb-3">Consignee (Shipped To)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="shipmentDetails.consigneeName" render={({ field }) => (
                  <FormItem><FormLabel>Consignee Name</FormLabel><FormControl><Input placeholder="Name of recipient" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="shipmentDetails.consigneeGstin" render={({ field }) => (
                  <FormItem><FormLabel>Consignee GSTIN</FormLabel><FormControl><Input placeholder="GSTIN if applicable" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="shipmentDetails.consigneeAddress" render={({ field }) => (
                <FormItem className="mt-4"><FormLabel>Consignee Address</FormLabel><FormControl><Textarea placeholder="Full shipping address" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="shipmentDetails.consigneeStateCode" render={({ field }) => (
                <FormItem className="mt-4"><FormLabel>Consignee State / Code</FormLabel><FormControl><Input placeholder="e.g., Tamil Nadu / 33" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <div className="border-t pt-6">
              <h4 className="text-md font-medium mb-3">Transport Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="shipmentDetails.transportationMode" render={({ field }) => (
                  <FormItem><FormLabel>Transportation Mode</FormLabel><FormControl><Input placeholder="e.g., Road, Courier" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="shipmentDetails.dateOfSupply" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Date of Supply</FormLabel>
                    <Popover><PopoverTrigger asChild><FormControl>
                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value && isValid(new Date(field.value)) ? formatDateFns(new Date(field.value), "PPP") : <span>Select date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button></FormControl></PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => field.onChange(date)} initialFocus /></PopoverContent>
                    </Popover><FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="shipmentDetails.lrNo" render={({ field }) => (
                  <FormItem><FormLabel>LR No. (Lorry Receipt)</FormLabel><FormControl><Input placeholder="Lorry Receipt Number" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="shipmentDetails.vehicleNo" render={({ field }) => (
                  <FormItem><FormLabel>Vehicle No.</FormLabel><FormControl><Input placeholder="e.g., TN01AB1234" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="shipmentDetails.carrierName" render={({ field }) => (
                  <FormItem><FormLabel>Carrier Name</FormLabel><FormControl><Input placeholder="e.g., FedEx, Delhivery" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="shipmentDetails.trackingNumber" render={({ field }) => (
                  <FormItem><FormLabel>Tracking Number</FormLabel><FormControl><Input placeholder="AWB or Tracking ID" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="shipmentDetails.placeOfSupply" render={({ field }) => (
                <FormItem ><FormLabel>Place of Supply</FormLabel><FormControl><Input placeholder="e.g., Chennai, Bangalore" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="shipmentDetails.shipDate" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Ship Date (Actual)</FormLabel>
                    <Popover><PopoverTrigger asChild><FormControl>
                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value && isValid(new Date(field.value)) ? formatDateFns(new Date(field.value), "PPP") : <span>Select shipping date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button></FormControl></PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => field.onChange(date)} initialFocus /></PopoverContent>
                    </Popover><FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle>Additional Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                 <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl><Textarea placeholder="Any additional notes for the customer." {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="termsAndConditions" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Terms & Conditions (Optional)</FormLabel>
                        <FormControl><Textarea placeholder="e.g. Payment due within 30 days." {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={formSubmitLoading || isDataLoading}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
          </Button>
          <Button type="submit" disabled={formSubmitLoading || isDataLoading}>
            {(formSubmitLoading || isDataLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {defaultValuesProp?.invoiceNumber ? "Save Changes" : "Create Invoice"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

    