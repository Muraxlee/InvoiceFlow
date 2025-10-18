
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const purchaseInvoiceSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  vendor: z.string().min(1, "Vendor name is required"),
  date: z.date({ required_error: "Invoice date is required" }),
  dueDate: z.date().optional(),
  amount: z.coerce.number().min(0, "Amount must be a positive number"),
  status: z.enum(["Paid", "Unpaid", "Pending", "Overdue"]),
});

export type PurchaseInvoiceFormValues = z.infer<typeof purchaseInvoiceSchema>;

interface PurchaseInvoiceFormProps {
  onSubmit: (data: PurchaseInvoiceFormValues) => void;
  defaultValues?: Partial<PurchaseInvoiceFormValues>;
  isLoading?: boolean;
  onCancel?: () => void;
  isEditMode?: boolean;
}

export function PurchaseInvoiceForm({ onSubmit, defaultValues, isLoading, onCancel, isEditMode = false }: PurchaseInvoiceFormProps) {
  const form = useForm<PurchaseInvoiceFormValues>({
    resolver: zodResolver(purchaseInvoiceSchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="invoiceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice ID</FormLabel>
                <FormControl><Input placeholder="e.g., VENDOR-123" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vendor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor / Supplier</FormLabel>
                <FormControl><Input placeholder="e.g., Fabric Mill Inc." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Invoice Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" className={cn(!field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Due Date (Optional)</FormLabel>
                 <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" className={cn(!field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (₹)</FormLabel>
                <FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="Unpaid">Unpaid</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Save Changes" : "Add Purchase Invoice"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
