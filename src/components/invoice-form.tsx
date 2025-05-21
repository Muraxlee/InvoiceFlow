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
import { CalendarIcon, PlusCircle, Trash2, Wand2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { suggestGstCategory, type GstSuggestionOutput } from "@/ai/flows/gst-suggestion";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(0.01, "Quantity must be positive"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  gstCategory: z.string().optional(),
  // amount will be calculated
});

const invoiceSchema = z.object({
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
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  onSubmit: (data: InvoiceFormValues) => void;
  defaultValues?: Partial<InvoiceFormValues>;
  isLoading?: boolean;
}

export function InvoiceForm({ onSubmit, defaultValues, isLoading }: InvoiceFormProps) {
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: defaultValues || {
      invoiceDate: new Date(),
      dueDate: new Date(new Date().setDate(new Date().getDate() + 30)), // Default due date 30 days from now
      items: [{ description: "", quantity: 1, price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { toast } = useToast();
  const [gstSuggestions, setGstSuggestions] = useState<(GstSuggestionOutput | null)[]>([]);
  const [loadingGst, setLoadingGst] = useState<boolean[]>([]);

  useEffect(() => {
    setGstSuggestions(new Array(fields.length).fill(null));
    setLoadingGst(new Array(fields.length).fill(false));
  }, [fields.length]);

  const handleSuggestGst = async (index: number) => {
    const itemDescription = form.getValues(`items.${index}.description`);
    if (!itemDescription) {
      toast({ title: "Missing Description", description: "Please enter an item description to get GST suggestions.", variant: "destructive" });
      return;
    }

    setLoadingGst(prev => { const newLoading = [...prev]; newLoading[index] = true; return newLoading; });
    try {
      const suggestion = await suggestGstCategory({ itemDescription });
      setGstSuggestions(prev => { const newSuggestions = [...prev]; newSuggestions[index] = suggestion; return newSuggestions; });
      form.setValue(`items.${index}.gstCategory`, suggestion.gstCategory);
      toast({ title: "GST Suggestion", description: `Suggested: ${suggestion.gstCategory} (Confidence: ${(suggestion.confidence * 100).toFixed(0)}%)` });
    } catch (error) {
      console.error("Error fetching GST suggestion:", error);
      toast({ title: "Error", description: "Could not fetch GST suggestion.", variant: "destructive" });
    } finally {
      setLoadingGst(prev => { const newLoading = [...prev]; newLoading[index] = false; return newLoading; });
    }
  };
  
  const watchItems = form.watch("items");
  const subtotal = watchItems.reduce((acc, item) => acc + (item.quantity || 0) * (item.price || 0), 0);
  // Placeholder GST calculation - this would be more complex in a real app
  const gstAmount = subtotal * 0.18; // Assuming a flat 18% GST for now
  const total = subtotal + gstAmount;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Customer Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
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
                  <FormControl><Input placeholder="e.g. INV-2024-001" {...field} /></FormControl>
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
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
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
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
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
                  <FormField control={form.control} name={`items.${index}.description`} render={({ field: itemField }) => (
                    <FormItem className="col-span-12 md:col-span-5">
                      <FormLabel className={cn(index !== 0 && "sr-only")}>Description</FormLabel>
                      <FormControl><Textarea placeholder="Item description" {...itemField} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`items.${index}.quantity`} render={({ field: itemField }) => (
                    <FormItem className="col-span-6 md:col-span-1">
                      <FormLabel className={cn(index !== 0 && "sr-only")}>Qty</FormLabel>
                      <FormControl><Input type="number" placeholder="1" {...itemField} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`items.${index}.price`} render={({ field: itemField }) => (
                    <FormItem className="col-span-6 md:col-span-2">
                      <FormLabel className={cn(index !== 0 && "sr-only")}>Price</FormLabel>
                      <FormControl><Input type="number" placeholder="0.00" {...itemField} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                   <FormField control={form.control} name={`items.${index}.gstCategory`} render={({ field: itemField }) => (
                    <FormItem className="col-span-10 md:col-span-3">
                      <FormLabel className={cn(index !== 0 && "sr-only")}>GST Category</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl><Input placeholder="e.g. HSN 1234" {...itemField} /></FormControl>
                        <Button type="button" size="icon" variant="outline" onClick={() => handleSuggestGst(index)} disabled={loadingGst[index]} aria-label="Suggest GST Category">
                          {loadingGst[index] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                        </Button>
                      </div>
                      {gstSuggestions[index] && <FormDescription>Confidence: {(gstSuggestions[index]!.confidence * 100).toFixed(0)}%</FormDescription>}
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="col-span-2 md:col-span-1 flex items-center pt-8">
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1} aria-label="Remove item">
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ description: "", quantity: 1, price: 0 })} className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </CardContent>
          <CardFooter className="flex justify-end">
            <div className="space-y-2 text-right min-w-[200px]">
              <div className="flex justify-between"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>GST (18%):</span><span>${gstAmount.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-lg"><span>Total:</span><span>${total.toFixed(2)}</span></div>
            </div>
          </CardFooter>
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
          <Button type="button" variant="outline" onClick={() => form.reset()} disabled={isLoading}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {defaultValues ? "Save Changes" : "Create Invoice"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
