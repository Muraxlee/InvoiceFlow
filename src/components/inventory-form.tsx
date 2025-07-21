
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
import { Loader2, Check, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import type { InventoryItem, Product } from "@/types/database";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const inventorySchema = z.object({
  productId: z.string().min(1, "You must select a product."),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
});

export type InventoryFormValues = Omit<InventoryItem, 'id' | 'updatedAt' | 'productName'>;

interface InventoryFormProps {
  products: Product[];
  inventoryItems: InventoryItem[];
  onSubmit: (data: InventoryFormValues) => void;
  defaultValues?: Partial<InventoryItem>;
  isLoading?: boolean;
  onCancel: () => void;
}

export function InventoryForm({ products, inventoryItems, onSubmit, defaultValues, isLoading, onCancel }: InventoryFormProps) {
  const [isProductPopoverOpen, setIsProductPopoverOpen] = useState(false);

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      productId: defaultValues?.productId || '',
      stock: defaultValues?.stock || 0,
    },
  });
  
  useEffect(() => {
    form.reset({
      productId: defaultValues?.productId || '',
      stock: defaultValues?.stock || 0,
    });
  }, [defaultValues, form]);
  
  const isEditMode = !!defaultValues?.id;

  const availableProducts = isEditMode 
    ? products 
    : products.filter(p => !inventoryItems.some(inv => inv.productId === p.id));

  const productName = products.find(p => p.id === form.watch('productId'))?.name || "Select product";

  const handleFormSubmit = (data: InventoryFormValues) => {
    const selectedProduct = products.find(p => p.id === data.productId);
    if (selectedProduct) {
      onSubmit({ ...data, productName: selectedProduct.name });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Product</FormLabel>
              <Popover open={isProductPopoverOpen} onOpenChange={setIsProductPopoverOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")} disabled={isEditMode}>
                      {isEditMode ? defaultValues?.productName : productName}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                {!isEditMode && (
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search products..." />
                      <CommandList>
                        <CommandEmpty>No available products found to add to inventory.</CommandEmpty>
                        <CommandGroup>
                          {availableProducts.map((product) => (
                            <CommandItem value={product.id} key={product.id} onSelect={(currentValue) => {
                              field.onChange(currentValue);
                              setIsProductPopoverOpen(false);
                            }}>
                              <Check className={cn("mr-2 h-4 w-4", product.id === field.value ? "opacity-100" : "opacity-0")} />
                              {product.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                )}
              </Popover>
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
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Save Changes" : "Add Item to Inventory"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
