
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import type { InventoryItem } from "@/types/database";

const inventorySchema = z.object({
  name: z.string().min(1, "Item name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().min(1, "Category is required"),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
});

export type InventoryFormValues = Omit<InventoryItem, 'id' | 'updatedAt'>;

interface InventoryFormProps {
  onSubmit: (data: InventoryFormValues) => void;
  defaultValues?: Partial<InventoryItem>;
  isLoading?: boolean;
  onCancel: () => void;
}

export function InventoryForm({ onSubmit, defaultValues, isLoading, onCancel }: InventoryFormProps) {
  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      name: '',
      sku: '',
      category: '',
      stock: 0,
      ...defaultValues,
    },
  });
  
  useEffect(() => {
    form.reset({
      name: '',
      sku: '',
      category: '',
      stock: 0,
      ...defaultValues,
    });
  }, [defaultValues, form]);

  const isEditMode = !!defaultValues?.id;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Cotton Fabric" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., FAB-COT-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock Quantity</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Fabrics, Buttons" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Save Changes" : "Add Item"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
