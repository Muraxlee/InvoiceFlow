"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, HelpCircle } from "lucide-react";
import type { Product } from "@/app/products/page"; // Assuming Product type is exported
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect } from "react";

const productSchema = z.object({
  id: z.string().min(1, "Product ID is required"),
  name: z.string().min(1, "Product name is required"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  hsn: z.string().min(1, "HSN/SAC code is required"),
  igstRate: z.coerce.number().min(0).default(18),
  cgstRate: z.coerce.number().min(0).default(9),
  sgstRate: z.coerce.number().min(0).default(9),
});

export type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  onSubmit: (data: ProductFormValues) => Promise<void> | void;
  defaultValues?: Partial<ProductFormValues>;
  isLoading?: boolean;
  onCancel?: () => void;
}

export function ProductForm({ onSubmit, defaultValues, isLoading, onCancel }: ProductFormProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: defaultValues || {
      id: `PROD${Date.now().toString().slice(-6)}`,
      name: "",
      price: 0,
      hsn: "",
      igstRate: 18,
      cgstRate: 9,
      sgstRate: 9,
    },
  });
  
  // Auto-generate product ID for new products
  useEffect(() => {
    if (!defaultValues?.id) {
      // Create a more unique product ID format with a random component
      const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const timestamp = Date.now().toString().slice(-6);
      const generatedId = `P${timestamp}${randomPart}`;
      form.setValue("id", generatedId);
    }
  }, [defaultValues, form]);

  const handleSubmit = async (data: ProductFormValues) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product ID</FormLabel>
              <FormControl>
                <Input placeholder="Auto-generated" {...field} readOnly className="bg-muted" />
              </FormControl>
              <FormDescription>
                Auto-generated unique product code
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Eco-Friendly Water Bottle" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (₹)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="e.g., 1999.99" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hsn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>HSN/SAC Code</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 8471" {...field} />
                </FormControl>
                <FormDescription>
                  Harmonized System code for GST classification
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="border p-4 rounded-md bg-gray-50/50">
          <h3 className="text-sm font-medium mb-3">GST Rates</h3>
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="igstRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    IGST
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="font-medium">Inter-state GST</p>
                          <p className="text-xs">Applied for sales between different states</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseFloat(value))} defaultValue={field.value !== undefined && field.value !== null ? field.value.toString() : "18"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="%" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="18">18%</SelectItem>
                      <SelectItem value="28">28%</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs font-medium text-muted-foreground">
                    Inter-state GST
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cgstRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    CGST
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="font-medium">Central GST</p>
                          <p className="text-xs">Central government's portion of tax for intra-state sales</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseFloat(value))} defaultValue={field.value !== undefined && field.value !== null ? field.value.toString() : "9"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="%" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="2.5">2.5%</SelectItem>
                      <SelectItem value="6">6%</SelectItem>
                      <SelectItem value="9">9%</SelectItem>
                      <SelectItem value="14">14%</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs font-medium text-muted-foreground">
                    Central GST
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sgstRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    SGST
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="font-medium">State GST</p>
                          <p className="text-xs">State government's portion of tax for intra-state sales</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseFloat(value))} defaultValue={field.value !== undefined && field.value !== null ? field.value.toString() : "9"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="%" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="2.5">2.5%</SelectItem>
                      <SelectItem value="6">6%</SelectItem>
                      <SelectItem value="9">9%</SelectItem>
                      <SelectItem value="14">14%</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs font-medium text-muted-foreground">
                    State GST
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {defaultValues?.id ? "Save Changes" : "Add Product"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
