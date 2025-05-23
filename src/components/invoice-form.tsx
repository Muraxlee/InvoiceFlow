"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
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
import { CalendarIcon, PlusCircle, Trash2, Wand2, Loader2, X, Check, ArrowLeft, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format as formatDateFns } from "date-fns";
import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  gstCategory: z.string().optional(), // HSN/SAC code
  applyIgst: z.boolean().default(true),
  applyCgst: z.boolean().default(false),
  applySgst: z.boolean().default(false),
  igstRate: z.coerce.number().min(0).default(18),
  cgstRate: z.coerce.number().min(0).default(9),
  sgstRate: z.coerce.number().min(0).default(9),
});

const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Invalid email address").optional().or(z.literal('')),
  customerAddress: z.string().optional(),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.date({ required_error: "Invoice date is required." }),
  dueDate: z.date({ required_error: "Due date is required." }),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  invoiceImage: z.string().optional().describe("URL or path to an image for invoice formatting"),
  paymentStatus: z.enum(["Paid", "Unpaid", "Partially Paid"]).default("Unpaid"),
  paymentMethod: z.string().optional(),
  shipmentDetails: z.object({
    shipDate: z.date().optional().nullable(),
    trackingNumber: z.string().optional(),
    carrierName: z.string().optional(),
    shippingAddress: z.string().optional(),
  }).optional(),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  onSubmit: (data: InvoiceFormValues) => void;
  defaultValues?: Partial<InvoiceFormValues>;
  isLoading?: boolean;
  onCancel?: () => void;
}

export function generateInvoiceNumber(invoiceDate: Date, increment: boolean = false): string {
  const config = loadFromLocalStorage<InvoiceConfig>(INVOICE_CONFIG_KEY, {
    prefix: DEFAULT_INVOICE_PREFIX,
    dailyCounters: {},
  });

  const prefix = (config.prefix || DEFAULT_INVOICE_PREFIX).substring(0,3).toUpperCase();
  const dateKey = formatDateFns(invoiceDate, "ddMMyyyy");

  let currentCounter = config.dailyCounters[dateKey] || 0;
  const nextCounter = currentCounter + 1;
  
  // Only save the incremented counter if explicitly requested
  if (increment) {
    config.dailyCounters[dateKey] = nextCounter;
    saveToLocalStorage(INVOICE_CONFIG_KEY, config);
  }

  const sequentialNumber = String(nextCounter).padStart(4, '0');
  
  return `${prefix}${dateKey}${sequentialNumber}`;
}

export function InvoiceForm({ onSubmit, defaultValues: defaultValuesProp, isLoading, onCancel }: InvoiceFormProps) {
  const router = useRouter();
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: defaultValuesProp || {
      invoiceDate: null as any, 
      dueDate: null as any,
      items: [{
        productId: "",
        quantity: 1,
        price: 0,
        gstCategory: "",
        applyIgst: true,
        applyCgst: false,
        applySgst: false,
        igstRate: 18,
        cgstRate: 9,
        sgstRate: 9
      }],
      customerId: "",
      customerName: "",
      customerEmail: "",
      customerAddress: "",
      invoiceNumber: "",
      notes: "",
      termsAndConditions: "",
      invoiceImage: "",
      paymentStatus: "Unpaid",
      paymentMethod: "",
      shipmentDetails: {
        shipDate: null,
        trackingNumber: "",
        carrierName: "",
        shippingAddress: ""
      }
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { toast } = useToast();
  const [gstSuggestions, setGstSuggestions] = useState<(GstSuggestionOutput | null)[]>([]);
  const [loadingGst, setLoadingGst] = useState<boolean[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    setGstSuggestions(new Array(fields.length).fill(null));
    setLoadingGst(new Array(fields.length).fill(false));
  }, [fields.length]);

  useEffect(() => {
    const isCreatingNew = !defaultValuesProp || !defaultValuesProp.invoiceNumber;

    if (isCreatingNew) {
      const currentInvoiceDate = form.getValues('invoiceDate');
      const currentDueDate = form.getValues('dueDate');
      
      if (!currentInvoiceDate) {
        form.setValue("invoiceDate", new Date(), { shouldValidate: true, shouldDirty: true });
      }
      if (!currentDueDate) {
        const todayForDueDate = currentInvoiceDate || new Date();
        const thirtyDaysFromNow = new Date(todayForDueDate);
        thirtyDaysFromNow.setDate(todayForDueDate.getDate() + 30);
        form.setValue("dueDate", thirtyDaysFromNow, { shouldValidate: true, shouldDirty: true });
      }

      const invoiceDateForNumber = form.getValues('invoiceDate') || new Date();
      if (!form.getValues('invoiceNumber')) {
         // Don't increment counter here, just preview the next number
         form.setValue("invoiceNumber", generateInvoiceNumber(invoiceDateForNumber, false), { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [defaultValuesProp, form]);

  // Load customers and products
  useEffect(() => {
    const storedCustomers = loadFromLocalStorage<Customer[]>("app_customers", []);
    const storedProducts = loadFromLocalStorage<Product[]>("app_products", []);
    setCustomers(storedCustomers);
    setProducts(storedProducts);
  }, []);

  const handleSuggestGst = async (index: number) => {
    const itemDescription = form.getValues(`items.${index}.description`);
    if (!itemDescription) {
      toast({ title: "Missing Description", description: "Please enter an item description to get tax category suggestions.", variant: "destructive" });
      return;
    }

    setLoadingGst(prev => { const newLoading = [...prev]; newLoading[index] = true; return newLoading; });
    try {
      const suggestion = await suggestGstCategory({ itemDescription });
      setGstSuggestions(prev => { const newSuggestions = [...prev]; newSuggestions[index] = suggestion; return newSuggestions; });
      form.setValue(`items.${index}.gstCategory`, suggestion.gstCategory); // gstCategory now refers to Tax Category / HSN
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
      form.setValue(`items.${index}.description`, product.description);
      form.setValue(`items.${index}.price`, product.price);
      form.setValue(`items.${index}.gstCategory`, product.gstCategory);
      
      // Set GST rates from product
      form.setValue(`items.${index}.igstRate`, product.igstRate);
      form.setValue(`items.${index}.cgstRate`, product.cgstRate);
      form.setValue(`items.${index}.sgstRate`, product.sgstRate);
      
      // Set default GST application (IGST by default)
      form.setValue(`items.${index}.applyIgst`, true);
      form.setValue(`items.${index}.applyCgst`, false);
      form.setValue(`items.${index}.applySgst`, false);
    }
  };
  
  const handleToggleGstType = (index: number, type: 'igst' | 'cgst' | 'sgst', value: boolean) => {
    if (type === 'igst') {
      // If turning on IGST, turn off CGST+SGST
      if (value) {
        form.setValue(`items.${index}.applyCgst`, false);
        form.setValue(`items.${index}.applySgst`, false);
      }
      form.setValue(`items.${index}.applyIgst`, value);
    } else {
      // If turning on CGST or SGST, turn off IGST
      if (value) {
        form.setValue(`items.${index}.applyIgst`, false);
        
        // CGST and SGST should always be toggled together
        form.setValue(`items.${index}.applyCgst`, true);
        form.setValue(`items.${index}.applySgst`, true);
      } else {
        // Allow turning off individually
        form.setValue(`items.${index}.apply${type.charAt(0).toUpperCase() + type.slice(1)}`, value);
      }
    }
    
    // Ensure at least one GST type is selected
    const applyIgst = form.getValues(`items.${index}.applyIgst`);
    const applyCgst = form.getValues(`items.${index}.applyCgst`);
    const applySgst = form.getValues(`items.${index}.applySgst`);
    
    if (!applyIgst && !applyCgst && !applySgst) {
      // Default to IGST if nothing is selected
      form.setValue(`items.${index}.applyIgst`, true);
    }
  };
  
  const handleSelectCustomer = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      form.setValue("customerId", customer.id);
      form.setValue("customerName", customer.name);
      form.setValue("customerEmail", customer.email);
      form.setValue("customerAddress", customer.address);
    }
  };
  
  const watchItems = form.watch("items");
  
  // Calculate subtotal, tax amounts, and total
  const calculateInvoiceAmounts = () => {
    const subtotal = watchItems.reduce((acc, item) => acc + (item.quantity || 0) * (item.price || 0), 0);
    
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    
    watchItems.forEach(item => {
      const itemAmount = (item.quantity || 0) * (item.price || 0);
      
      if (item.applyIgst) {
        const taxRate = item.igstRate / 100;
        igstAmount += itemAmount * taxRate;
      }
      
      if (item.applyCgst) {
        const taxRate = item.cgstRate / 100;
        cgstAmount += itemAmount * taxRate;
      }
      
      if (item.applySgst) {
        const taxRate = item.sgstRate / 100;
        sgstAmount += itemAmount * taxRate;
      }
    });
    
    const totalTax = cgstAmount + sgstAmount + igstAmount;
    const total = subtotal + totalTax;
    
    return {
      subtotal,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalTax,
      total
    };
  };
  
  const { subtotal, cgstAmount, sgstAmount, igstAmount, totalTax, total } = calculateInvoiceAmounts();

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  const handleFormSubmit = (data: InvoiceFormValues) => {
    // Increment the counter now that we're actually submitting
    const invoiceDateForNumber = data.invoiceDate || new Date();
    // Regenerate the invoice number with increment=true to save the counter
    const confirmedInvoiceNumber = generateInvoiceNumber(invoiceDateForNumber, true);
    data.invoiceNumber = confirmedInvoiceNumber;
    
    // Call the provided onSubmit function with our processed data
    onSubmit(data);
  };

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
                    <FormLabel>Select Customer</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? customers.find(
                                  (customer) => customer.id === field.value
                                )?.name
                              : "Select customer..."}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search customers..." />
                          <CommandEmpty>No customer found.</CommandEmpty>
                          <CommandList>
                            <CommandGroup>
                              {customers.map((customer) => (
                                <CommandItem
                                  key={customer.id}
                                  value={customer.id}
                                  onSelect={() => {
                                    handleSelectCustomer(customer.id);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      customer.id === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
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
              <FormField control={form.control} name="customerName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl><Input placeholder="e.g. Acme Corp" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="customerEmail" render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Email (Optional)</FormLabel>
                  <FormControl><Input placeholder="e.g. contact@acme.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="customerAddress" render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Address (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="e.g. 123 Main St, Anytown USA" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Number</FormLabel>
                  <FormControl><Input placeholder="e.g. INVDDMMYYYY0001" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="invoiceDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Invoice Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? formatDateFns(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar 
                        mode="single" 
                        selected={field.value} 
                        onSelect={(date) => {
                          field.onChange(date);
                          // Update the invoice number when date changes 
                          // but don't increment the counter
                          if (date && !defaultValuesProp?.invoiceNumber) {
                            form.setValue(
                              "invoiceNumber", 
                              generateInvoiceNumber(date, false),
                              { shouldValidate: true }
                            );
                          }
                        }}
                        initialFocus 
                        disabled={(date) => date < new Date("1900-01-01")}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? formatDateFns(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={(date) => date < new Date("1900-01-01")}/>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="paymentStatus" render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Status</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-row space-x-2 pt-2"
                    >
                      <FormItem className="flex items-center space-x-1 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Paid" />
                        </FormControl>
                        <FormLabel className="font-normal">Paid</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-1 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Unpaid" />
                        </FormControl>
                        <FormLabel className="font-normal">Unpaid</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-1 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Partially Paid" />
                        </FormControl>
                        <FormLabel className="font-normal">Partially Paid</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Invoice Items</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-4 items-start border p-4 rounded-md shadow-sm">
                  <div className="col-span-12 md:col-span-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          {form.getValues(`items.${index}.productId`) 
                            ? products.find(p => p.id === form.getValues(`items.${index}.productId`))?.name
                            : "Select a product..."
                          }
                          <PlusCircle className="ml-2 h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search products..." />
                          <CommandEmpty>No products found.</CommandEmpty>
                          <CommandList>
                            <CommandGroup>
                              {products.map((product) => (
                                <CommandItem
                                  key={product.id}
                                  value={product.id}
                                  onSelect={() => handleSelectProduct(index, product.id)}
                                >
                                  <div className="flex items-center">
                                    <Image 
                                      src={product.imageUrl || "https://placehold.co/30x30.png"} 
                                      alt={product.name} 
                                      width={30} 
                                      height={30} 
                                      className="rounded-md mr-2"
                                    />
                                    <span>{product.name}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <FormField control={form.control} name={`items.${index}.quantity`} render={({ field: itemField }) => (
                    <FormItem className="col-span-3 md:col-span-1">
                      <FormLabel className={cn(index !== 0 && "sr-only")}>Qty</FormLabel>
                      <FormControl><Input type="number" placeholder="1" {...itemField} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`items.${index}.price`} render={({ field: itemField }) => (
                    <FormItem className="col-span-4 md:col-span-2">
                      <FormLabel className={cn(index !== 0 && "sr-only")}>Price (₹)</FormLabel>
                      <FormControl><Input type="number" placeholder="0.00" {...itemField} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`items.${index}.gstCategory`} render={({ field: itemField }) => (
                    <FormItem className="col-span-6 md:col-span-3">
                      <FormLabel className={cn(index !== 0 && "sr-only")}>Tax Category</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl><Input placeholder="e.g. HSN 1234" {...itemField} /></FormControl>
                        <Button type="button" size="icon" variant="outline" onClick={() => handleSuggestGst(index)} disabled={loadingGst[index]} aria-label="Suggest Tax Category">
                          {loadingGst[index] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="col-span-6 md:col-span-3">
                    <FormLabel className={cn(index !== 0 && "sr-only")}>GST Types</FormLabel>
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex items-center space-x-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.applyIgst`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox 
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    handleToggleGstType(index, 'igst', checked === true);
                                  }} 
                                />
                              </FormControl>
                              <div className="flex items-center gap-1">
                                <FormLabel className="text-sm font-medium leading-none cursor-pointer">
                                  IGST
                                </FormLabel>
                                <Badge variant="outline" className="ml-1">{form.getValues(`items.${index}.igstRate`)}%</Badge>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help ml-1" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p className="font-medium">Inter-state GST</p>
                                      <p className="text-xs">Applied for sales between different states</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.applyCgst`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox 
                                  checked={field.value} 
                                  onCheckedChange={(checked) => {
                                    handleToggleGstType(index, 'cgst', checked === true);
                                  }}
                                />
                              </FormControl>
                              <div className="flex items-center gap-1">
                                <FormLabel className="text-sm font-medium leading-none cursor-pointer">
                                  CGST
                                </FormLabel>
                                <Badge variant="outline" className="ml-1">{form.getValues(`items.${index}.cgstRate`)}%</Badge>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help ml-1" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p className="font-medium">Central GST</p>
                                      <p className="text-xs">Central government's portion of tax for intra-state sales</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`items.${index}.applySgst`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox 
                                  checked={field.value} 
                                  onCheckedChange={(checked) => {
                                    handleToggleGstType(index, 'sgst', checked === true);
                                  }}
                                />
                              </FormControl>
                              <div className="flex items-center gap-1">
                                <FormLabel className="text-sm font-medium leading-none cursor-pointer">
                                  SGST
                                </FormLabel>
                                <Badge variant="outline" className="ml-1">{form.getValues(`items.${index}.sgstRate`)}%</Badge>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help ml-1" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p className="font-medium">State GST</p>
                                      <p className="text-xs">State government's portion of tax for intra-state sales</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="col-span-1 md:col-span-1 flex items-center justify-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1} aria-label="Remove item">
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ 
              productId: "",
              description: "", 
              quantity: 1, 
              price: 0, 
              gstCategory: "", 
              applyIgst: true,
              applyCgst: false,
              applySgst: false,
              igstRate: 18,
              cgstRate: 9,
              sgstRate: 9,
            })} className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </CardContent>
          <CardFooter className="flex justify-end">
            <div className="space-y-2 text-right min-w-[250px]">
              <div className="flex justify-between"><span>Subtotal:</span><span>₹{subtotal.toFixed(2)}</span></div>
              {igstAmount > 0 && (
                <div className="flex justify-between"><span>IGST:</span><span>₹{igstAmount.toFixed(2)}</span></div>
              )}
              {cgstAmount > 0 && (
                <>
                  <div className="flex justify-between"><span>CGST:</span><span>₹{cgstAmount.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>SGST:</span><span>₹{sgstAmount.toFixed(2)}</span></div>
                </>
              )}
              <div className="flex justify-between font-bold text-lg"><span>Total:</span><span>₹{total.toFixed(2)}</span></div>
            </div>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader><CardTitle>Shipment Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="shipmentDetails.shippingAddress" render={({ field }) => (
              <FormItem>
                <FormLabel>Shipping Address</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter shipping address if different from billing address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField control={form.control} name="shipmentDetails.shipDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Ship Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? formatDateFns(field.value, "PPP") : <span>Select shipping date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar 
                        mode="single" 
                        selected={field.value ? new Date(field.value) : undefined} 
                        onSelect={(date) => field.onChange(date)}
                        initialFocus 
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="shipmentDetails.carrierName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Carrier/Courier Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., FedEx, DHL" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="shipmentDetails.trackingNumber" render={({ field }) => (
              <FormItem>
                <FormLabel>Tracking Number</FormLabel>
                <FormControl>
                  <Input placeholder="Enter shipment tracking number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader><CardTitle>Additional Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                 <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl><Textarea placeholder="Any additional notes for the customer." {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="termsAndConditions" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Terms & Conditions (Optional)</FormLabel>
                        <FormControl><Textarea placeholder="e.g. Payment due within 30 days." {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                 <FormField control={form.control} name="invoiceImage" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Invoice Image (Optional URL)</FormLabel>
                        <FormControl><Input placeholder="https://example.com/invoice-header.png" {...field} /></FormControl>
                        <FormDescription>Add an image URL for custom invoice formatting (e.g., logo, letterhead).</FormDescription>
                        {field.value && <div className="mt-2"><Image src={field.value.startsWith('http') ? field.value : `https://placehold.co/300x100.png?text=Invalid+URL`} alt="Invoice Format Image" width={300} height={100} className="rounded border" data-ai-hint="invoice template"/></div>}
                        <FormMessage />
                    </FormItem>
                )} />
            </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {defaultValuesProp ? "Save Changes" : "Create Invoice"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
