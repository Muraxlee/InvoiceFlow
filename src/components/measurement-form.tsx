
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const measurementSchema = z.object({
  id: z.string().optional(),
  type: z.string().min(1, "Measurement type is required"),
  customType: z.string().optional(),
  value: z.coerce.number().positive("Value must be a positive number"),
  unit: z.string().min(1, "Unit is required"),
  recordedDate: z.date({ required_error: "Date is required." }),
  notes: z.string().optional(),
}).refine(data => {
    if (data.type === 'Custom' && !data.customType) {
        return false;
    }
    return true;
}, {
    message: "Custom type name is required",
    path: ["customType"],
});

export type MeasurementFormValues = z.infer<typeof measurementSchema>;

const defaultTypes = ["Chest", "Waist", "Hip", "Shoulder Width", "Arm Length", "Inseam", "Neck", "Sleeve Length", "Height", "Weight", "Custom"];
const defaultUnits = ["in", "cm", "kg", "lb"];

interface MeasurementFormProps {
  onSubmit: (data: MeasurementFormValues) => Promise<void> | void;
  defaultValues?: Partial<MeasurementFormValues>;
  isLoading?: boolean;
  onCancel?: () => void;
}

export function MeasurementForm({ onSubmit, defaultValues, isLoading, onCancel }: MeasurementFormProps) {
  const form = useForm<MeasurementFormValues>({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      recordedDate: new Date(),
      ...defaultValues,
    },
  });

  const watchType = form.watch("type");
  
  useEffect(() => {
    if (defaultValues) {
        form.reset({
            ...defaultValues,
            recordedDate: defaultValues.recordedDate ? new Date(defaultValues.recordedDate) : new Date(),
        });
    }
  }, [defaultValues, form]);

  const isEditMode = !!defaultValues?.id;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Measurement Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {defaultTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            {watchType === 'Custom' && (
                <FormField
                control={form.control}
                name="customType"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Custom Type Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Bicep" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}
        </div>

        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.1" placeholder="e.g., 36.5" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {defaultUnits.map(unit => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        
        <FormField
            control={form.control}
            name="recordedDate"
            render={({ field }) => (
            <FormItem className="flex flex-col">
                <FormLabel>Date Recorded</FormLabel>
                <Popover>
                <PopoverTrigger asChild>
                    <FormControl>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                        )}
                    >
                        {field.value ? (
                        format(field.value, "PP")
                        ) : (
                        <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                    </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                    />
                </PopoverContent>
                </Popover>
                <FormMessage />
            </FormItem>
            )}
        />
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any additional notes about this measurement..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Save Changes" : "Save Measurement"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
