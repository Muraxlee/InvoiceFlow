
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
import { CalendarIcon, PlusCircle, Trash2, Loader2, X, Check, ArrowLeft, HelpCircle, UserPlus, ChevronDown, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { format as formatDateFns, isValid, addDays } from "date-fns";
import { useState, useEffect, useMemo } from "react";
import { suggestGstCategory, type GstSuggestionOutput } from '@/ai/flows/gst-suggestion';
import { useToast } from "@/hooks/use-toast";
import { loadFromLocalStorage, saveToLocalStorage, INVOICE_CONFIG_KEY, DEFAULT_INVOICE_PREFIX, type InvoiceConfig } from "@/lib/localStorage";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { Product, Customer } from "@/types/database";
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
import { useQuery } from '@tanstack/react-query';
import { getCustomers, getProducts } from '@/lib/firestore-actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  productName: z.string().optional(), // Added for display
});

const invoiceSchema = z.object({
  id: z.string().optional(),
  roundOffApplied: z.boolean().default(false),
  customerId: z.string().min(1, "Customer selection is required."),
  customerName: z.string().min(1, "Customer name is required (auto-filled on selection)."),
  customerEmail: z.string().email("Invalid email address (auto-filled on selection).").optional().or(z.literal('')),
  customerAddress: z.string().optional(),
  customerGstin: z.string().optional().or(z.literal('')),
  customerState: z.string().optional().or(z.literal('')),
  customerStateCode: z.string().optional().or(z.literal('')),
  invoiceNumber: z.string().min(1, "Invoice number is required."),
  invoiceDate: z.date({ required_error: "Invoice date is required." }),
  dueDate: z.date().optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required."),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  paymentStatus: z.enum(["Paid", "Unpaid", "Partially Paid", "Draft", "Pending", "Overdue"]).default("Unpaid"),
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

  const currentCounter = config.dailyCounters[dateKey] || 0;
  const useCounter = increment ? currentCounter + 1 : (currentCounter > 0 ? currentCounter + 1 : 1);

  if (increment) {
    config.dailyCounters[dateKey] = useCounter;
    saveToLocalStorage(INVOICE_CONFIG_KEY, config);
  }
  
  const sequentialNumber = String(useCounter).padStart(4, '0');

  return `${prefix}${dateKey}${sequentialNumber}`;
}

export function InvoiceForm({ onSubmit, defaultValues: defaultValuesProp, isLoading: formSubmitLoading, onCancel }: InvoiceFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const { data: customers, isLoading: isLoadingCustomers, error: customersError, refetch: refetchCustomers } = useQuery<Customer[]>({ queryKey: ['customers'], queryFn: getCustomers });
  const { data: products, isLoading: isLoadingProducts, error: productsError, refetch: refetchProducts } = useQuery<Product[]>({ queryKey: ['products'], queryFn: getProducts });
  
  const [isCustomerPopoverOpen, setIsCustomerPopoverOpen] = useState(false);
  const [productPopoversOpen, setProductPopoversOpen] = useState<boolean[]>([]);
  
  const [showDueDate, setShowDueDate] = useState(false);
  const [applyRoundOff, setApplyRoundOff] = useState(defaultValuesProp?.roundOffApplied || false);
  const [sameAsBilling, setSameAsBilling] = useState(true);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      items: [{
        productId: "", description: "", quantity: 1, price: 0,
        applyIgst: true, applyCgst: false, applySgst: false, igstRate: 18, cgstRate: 9, sgstRate: 9
      }],
      ...defaultValuesProp
    }, 
  });
  
  const { getValues, setValue, watch, reset } = form;

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const watchItems = watch("items");
  const watchInvoiceDate = watch("invoiceDate");
  const customerId = watch("customerId");

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
        setShowDueDate(isCreatingNew ? false : !!defaultValuesProp?.dueDate);
        initialDueDate = null;
      }
    }
    
    const initialInvoiceNumber = isCreatingNew && initialInvoiceDate && typeof window !== 'undefined'
        ? generateInvoiceNumber(initialInvoiceDate, false) 
        : defaultValuesProp?.invoiceNumber || '';

    reset({
      ...defaultValuesProp,
      invoiceNumber: initialInvoiceNumber,
      invoiceDate: initialInvoiceDate || new Date(),
      dueDate: initialDueDate, 
    });

  }, [defaultValuesProp, reset]);

  useEffect(() => {
    if (showDueDate && !getValues("dueDate") && watchInvoiceDate && typeof window !== 'undefined') {
      setValue("dueDate", addDays(new Date(watchInvoiceDate), 30));
    } else if (!showDueDate) {
      setValue("dueDate", null);
    }
  }, [showDueDate, watchInvoiceDate, getValues, setValue]);

  useEffect(() => {
    if (sameAsBilling && customerId) {
      const customer = customers?.find(c => c.id === customerId);
      if (customer) {
        setValue("shipmentDetails.consigneeName", customer.name);
        setValue("shipmentDetails.consigneeAddress", customer.address || "");
        setValue("shipmentDetails.consigneeGstin", customer.gstin || "");
        setValue("shipmentDetails.consigneeStateCode", customer.state ? `${customer.state} / ${customer.stateCode || ''}` : "");
      }
    }
  }, [sameAsBilling, customerId, customers, setValue]);

  const handleToggleGstType = (index: number, type: 'igst' | 'cgstSgst', value: boolean) => {
    if (type === 'igst') {
      form.setValue(`items.${index}.applyIgst`, value);
      if (value) { 
        form.setValue(`items.${index}.applyCgst`, false);
        form.setValue(`items.${index}.applySgst`, false);
      } else if (!form.getValues(`items.${index}.applyCgst`)) {
        form.setValue(`items.${index}.applyCgst`, true);
        form.setValue(`items.${index}.applySgst`, true);
      }
    } else if (type === 'cgstSgst') { 
      form.setValue(`items.${index}.applyCgst`, value);
      form.setValue(`items.${index}.applySgst`, value);
      if (value) { 
        form.setValue(`items.${index}.applyIgst`, false);
      } else if (!form.getValues(`items.${index}.applyIgst`)) {
        form.setValue(`items.${index}.applyIgst`, true);
      }
    }
  
    const { applyIgst, applyCgst, applySgst } = form.getValues(`items.${index}`);
    if (!applyIgst && !applyCgst && !applySgst) {
      form.setValue(`items.${index}.applyIgst`, true);
    }
  };

  const { subtotal, cgstAmount, sgstAmount, igstAmount, total, roundOffDifference, finalTotal } = useMemo(() => {
    const currentItems = watchItems || [];
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
  }, [watchItems, applyRoundOff]);

  const handleCancel = () => {
    if (onCancel) onCancel();
    else router.back();
  };

  const handleFormSubmit = (data: InvoiceFormValues) => {
    const submissionData = { ...data, roundOffApplied: applyRoundOff };
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
  
  const queryError = customersError || productsError;
  const handleRefetch = () => {
    if (customersError) refetchCustomers();
    if (productsError) refetchProducts();
  };

  if (queryError) {
     return (
        <Card>
            <CardHeader>
                <CardTitle>Error Loading Form Data</CardTitle>
            </CardHeader>
            <CardContent>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error: Missing or Insufficient Permissions</AlertTitle>
                  <AlertDescription>
                    <p>The form cannot load required data (customers, products). This is usually because the Firestore security rules have not been deployed to your project.</p>
                    <p className="mt-2 font-semibold">Please deploy the rules using the Firebase CLI:</p>
                    <code className="block my-2 p-2 bg-black/20 rounded text-xs">firebase deploy --only firestore:rules</code>
                    <p>After deploying, please refresh this page or click "Try Again".</p>
                  </AlertDescription>
                </Alert>
                <div className="mt-4 flex gap-2">
                  <Button onClick={handleRefetch} className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" /> Try Again
                  </Button>
                   <Button variant="outline" onClick={handleCancel}>Back</Button>
                </div>
            </CardContent>
        </Card>
    );
  }

  if (isLoadingCustomers || isLoadingProducts) { 
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
        {/* Main Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
             <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Customer*</FormLabel>
                    <Popover open={isCustomerPopoverOpen} onOpenChange={setIsCustomerPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                            {field.value ? customers?.find((c) => c.id === field.value)?.name : "Select a customer"}
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Search customers..." />
                          <CommandList>
                            <CommandEmpty>
                              <div className="p-4 text-center text-sm">
                                <p>No customers found.</p>
                                <Link href="/customers" passHref><Button variant="link" className="mt-1">Add a Customer</Button></Link>
                              </div>
                            </CommandEmpty>
                            <CommandGroup>
                              {customers?.map((customer) => (
                                <CommandItem value={customer.name} key={customer.id} onSelect={() => {
                                  field.onChange(customer.id);
                                  const selectedCustomer = customers?.find(c => c.id === customer.id);
                                  if (selectedCustomer) {
                                      setValue("customerName", selectedCustomer.name);
                                      setValue("customerEmail", selectedCustomer.email || "");
                                      setValue("customerAddress", selectedCustomer.address || "");
                                      setValue("customerGstin", selectedCustomer.gstin || "");
                                      setValue("customerState", selectedCustomer.state || "");
                                      setValue("customerStateCode", selectedCustomer.stateCode || "");
                                      if (sameAsBilling) {
                                        setValue("shipmentDetails.consigneeName", selectedCustomer.name);
                                        setValue("shipmentDetails.consigneeAddress", selectedCustomer.address || "");
                                        setValue("shipmentDetails.consigneeGstin", selectedCustomer.gstin || "");
                                        setValue("shipmentDetails.consigneeStateCode", selectedCustomer.state ? `${selectedCustomer.state} / ${selectedCustomer.stateCode || ''}` : "");
                                      }
                                  }
                                  setIsCustomerPopoverOpen(false);
                                }}>
                                  <Check className={cn("mr-2 h-4 w-4", customer.id === field.value ? "opacity-100" : "opacity-0")} />
                                  {customer.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField control={form.control} name="invoiceDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Invoice Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value && isValid(new Date(field.value)) ? (formatDateFns(new Date(field.value), "PP")) : (<span>Pick a date</span>)}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button></FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                  </Popover><FormMessage />
                </FormItem>
              )}/>
               <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
                  <FormItem><FormLabel>Invoice Number</FormLabel><FormControl><Input {...field} readOnly className="bg-muted cursor-not-allowed"/></FormControl><FormMessage /></FormItem>
              )}/>

              <div className="flex items-center space-x-2 pt-4">
                  <Checkbox id="show-due-date" checked={showDueDate} onCheckedChange={(checked) => setShowDueDate(Boolean(checked))} />
                  <Label htmlFor="show-due-date" className="text-sm font-medium leading-none">Add a due date</Label>
              </div>

              {showDueDate && (
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value && isValid(new Date(field.value)) ? (formatDateFns(new Date(field.value), "PP")) : (<span>Pick a date</span>)}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button></FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                    </Popover><FormMessage />
                  </FormItem>
                )}/>
              )}

              <FormField control={form.control} name="paymentStatus" render={({ field }) => (
                <FormItem><FormLabel>Payment Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Unpaid">Unpaid</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Draft">Draft</SelectItem>
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )}/>
          </CardContent>
        </Card>

        {/* Items Card */}
        <Card>
          <CardHeader><CardTitle>Invoice Items</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-x-4 gap-y-2 p-3 border rounded-md relative hover:bg-muted/30">
                  <div className="col-span-12 md:col-span-4">
                    <FormField control={form.control} name={`items.${index}.productId`} render={({ field: productField }) => (
                      <FormItem><FormLabel>Product/Service</FormLabel>
                        <Popover open={productPopoversOpen[index]} onOpenChange={(isOpen) => setProductPopoversOpen(p => { const n = [...p]; n[index] = isOpen; return n; })}>
                          <PopoverTrigger asChild><FormControl>
                              <Button variant="outline" role="combobox" className="w-full justify-between">
                                {productField.value ? products?.find(p => p.id === productField.value)?.name : "Select product"}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                              </Button>
                          </FormControl></PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command>
                              <CommandInput placeholder="Search products..." />
                              <CommandList><CommandEmpty>No products found.</CommandEmpty>
                                <CommandGroup>{products?.map(p => (
                                  <CommandItem value={p.name} key={p.id} onSelect={() => {
                                      productField.onChange(p.id);
                                      const product = products?.find(prod => prod.id === p.id);
                                      if (product) {
                                          setValue(`items.${index}.description`, product.description || product.name);
                                          setValue(`items.${index}.price`, product.price);
                                          setValue(`items.${index}.productName`, product.name);
                                          setValue(`items.${index}.gstCategory`, product.hsn || "");
                                          setValue(`items.${index}.igstRate`, Number(product.igstRate || 18));
                                          setValue(`items.${index}.cgstRate`, Number(product.cgstRate || 9));
                                          setValue(`items.${index}.sgstRate`, Number(product.sgstRate || 9));
                                          setValue(`items.${index}.applyIgst`, true);
                                          setValue(`items.${index}.applyCgst`, false);
                                          setValue(`items.${index}.applySgst`, false);
                                      }
                                      setProductPopoversOpen(prev => { const newState = [...prev]; newState[index] = false; return newState; });
                                  }}>
                                    <Check className={cn("mr-2 h-4 w-4", p.id === productField.value ? "opacity-100" : "opacity-0")} />
                                    {p.name}
                                  </CommandItem>
                                ))}</CommandGroup>
                              </CommandList>
                          </Command></PopoverContent>
                        </Popover><FormMessage />
                      </FormItem>
                    )}/>
                  </div>
                  <div className="col-span-6 md:col-span-2"><FormField control={form.control} name={`items.${index}.quantity`} render={({ field: qtyField }) => (
                    <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" {...qtyField} /></FormControl><FormMessage /></FormItem>
                  )}/></div>
                  <div className="col-span-6 md:col-span-2"><FormField control={form.control} name={`items.${index}.price`} render={({ field: priceField }) => (
                    <FormItem><FormLabel>Price (₹)</FormLabel><FormControl><Input type="number" {...priceField} /></FormControl><FormMessage /></FormItem>
                  )}/></div>
                  <div className="col-span-12 md:col-span-4"><FormField control={form.control} name={`items.${index}.gstCategory`} render={({ field: gstField }) => (
                    <FormItem><FormLabel>HSN/SAC</FormLabel><FormControl><Input {...gstField} /></FormControl><FormMessage /></FormItem>
                  )}/></div>

                  <div className="col-span-12 flex justify-end">
                    <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="button" variant="outline" onClick={() => append({ productId: "", description: "", quantity: 1, price: 0, productName: "", gstCategory: "", applyIgst: true, applyCgst: false, applySgst: false, igstRate: 18, cgstRate: 9, sgstRate: 9 })}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </CardFooter>
        </Card>

        {/* Totals Section */}
        <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="flex justify-end">
                <div className="w-full max-w-sm space-y-3">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                    {igstAmount > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">IGST</span><span>₹{igstAmount.toFixed(2)}</span></div>}
                    {cgstAmount > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">CGST</span><span>₹{cgstAmount.toFixed(2)}</span></div>}
                    {sgstAmount > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">SGST</span><span>₹{sgstAmount.toFixed(2)}</span></div>}
                    <div className="flex justify-between text-sm font-medium border-t pt-2 mt-1"><span className="text-muted-foreground">Total Before Round Off</span><span>₹{total.toFixed(2)}</span></div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="round-off" className="flex items-center gap-2">Round Off Total
                            <TooltipProvider><Tooltip>
                                <TooltipTrigger asChild><HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" /></TooltipTrigger>
                                <TooltipContent><p>Rounds the final invoice amount to the nearest rupee.</p></TooltipContent>
                            </Tooltip></TooltipProvider>
                        </Label>
                        <Switch id="round-off" checked={applyRoundOff} onCheckedChange={setApplyRoundOff} />
                    </div>
                    {applyRoundOff && roundOffDifference !== 0 && (
                        <div className="flex justify-between text-sm text-muted-foreground"><span >Round Off Adjustment</span><span>{roundOffDifference > 0 ? '+' : ''}₹{roundOffDifference.toFixed(2)}</span></div>
                    )}
                    <div className="flex justify-between text-xl font-bold border-t pt-2"><span>Grand Total</span><span>₹{finalTotal.toFixed(2)}</span></div>
                </div>
            </CardContent>
        </Card>
        
        {/* Notes and Terms */}
        <Card>
            <CardHeader><CardTitle>Notes & Terms</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Any additional notes for the customer..." {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="termsAndConditions" render={({ field }) => (
                    <FormItem><FormLabel>Terms & Conditions</FormLabel><FormControl><Textarea placeholder="e.g., Payment due within 30 days..." {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
            </CardContent>
        </Card>
        
        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={formSubmitLoading}>Cancel</Button>
            <Button type="submit" disabled={formSubmitLoading}>
                {formSubmitLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {defaultValuesProp?.id ? "Save Changes" : "Create Invoice"}
            </Button>
        </div>
      </form>
    </Form>
  );
}
