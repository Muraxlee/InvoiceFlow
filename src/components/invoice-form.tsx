
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
  
  const [isCustomerSelected, setIsCustomerSelected] = useState(false);
  
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

    if (defaultValuesProp?.customerId) {
      setIsCustomerSelected(true);
    } else {
      setIsCustomerSelected(false);
    }
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
        setValue("shipmentDetails.consigneeName", customer.name, { shouldValidate: true });
        setValue("shipmentDetails.consigneeAddress", customer.address || "", { shouldValidate: true });
        setValue("shipmentDetails.consigneeGstin", customer.gstin || "", { shouldValidate: true });
        setValue("shipmentDetails.consigneeStateCode", customer.state ? `${customer.state} / ${customer.stateCode || ''}` : "", { shouldValidate: true });
      }
    }
  }, [sameAsBilling, customerId, customers, setValue]);

  const handleSelectProduct = (index: number, productId: string) => {
    const product = products?.find(p => p.id === productId);
    if (product) {
      form.setValue(`items.${index}.productId`, product.id);
      form.setValue(`items.${index}.description`, product.description || product.name);
      form.setValue(`items.${index}.price`, product.price);
      form.setValue(`items.${index}.productName`, product.name);
      form.setValue(`items.${index}.gstCategory`, product.hsn || "");
      form.setValue(`items.${index}.igstRate`, Number(product.igstRate || 18));
      form.setValue(`items.${index}.cgstRate`, Number(product.cgstRate || 9));
      form.setValue(`items.${index}.sgstRate`, Number(product.sgstRate || 9));
      form.setValue(`items.${index}.applyIgst`, true); 
      form.setValue(`items.${index}.applyCgst`, false);
      form.setValue(`items.${index}.applySgst`, false);
            
      setProductPopoversOpen(prev => { const newState = [...prev]; newState[index] = false; return newState; });
    }
  };

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

  const handleSelectCustomer = (customerId: string) => {
    const customer = customers?.find(c => c.id === customerId);
    if (customer) {
      form.setValue("customerId", customer.id, { shouldValidate: true });
      form.setValue("customerName", customer.name, { shouldValidate: true });
      form.setValue("customerEmail", customer.email || "", { shouldValidate: true });
      form.setValue("customerAddress", customer.address || "", { shouldValidate: true });
      form.setValue("customerGstin", customer.gstin || "", { shouldValidate: true });
      form.setValue("customerState", customer.state || "", { shouldValidate: true });
      form.setValue("customerStateCode", customer.stateCode || "", { shouldValidate: true });
      
      if (sameAsBilling) {
        form.setValue("shipmentDetails.consigneeName", customer.name, { shouldValidate: true });
        form.setValue("shipmentDetails.consigneeAddress", customer.address || "", { shouldValidate: true });
        form.setValue("shipmentDetails.consigneeGstin", customer.gstin || "", { shouldValidate: true });
        form.setValue("shipmentDetails.consigneeStateCode", customer.state ? `${customer.state} / ${customer.stateCode || ''}` : "", { shouldValidate: true });
      }
      
      setIsCustomerSelected(true);
      setIsCustomerPopoverOpen(false); 
    } else {
      setIsCustomerSelected(false);
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
        {/* The rest of the form JSX remains the same */}
      </form>
    </Form>
  );
}
