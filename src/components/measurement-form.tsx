
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CalendarIcon, PlusCircle, Trash2, Barcode } from "lucide-react";
import { useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, isValid } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const measurementValueSchema = z.object({
  name: z.string().min(1, "Field name is required"),
  value: z.coerce.number().positive("Value must be a positive number"),
  unit: z.string().min(1, "Unit is required"),
});

const measurementSchema = z.object({
  id: z.string().optional(),
  uniqueId: z.string().min(1, "Unique ID is required."),
  customerId: z.string().optional(),
  customerName: z.string().min(1, "Customer name is required"),
  type: z.string().min(1, "Garment type is required"),
  customType: z.string().optional(),
  recordedDate: z.date({ required_error: "Date is required." }),
  deliveryDate: z.date().optional().nullable(),
  values: z.array(measurementValueSchema).min(1, "At least one measurement value is required."),
  notes: z.string().optional(),
}).refine(data => {
    if (data.type === 'Custom' && (!data.customType || data.customType.trim() === '')) {
        return false;
    }
    return true;
}, {
    message: "Custom garment type name is required",
    path: ["customType"],
});

export type MeasurementFormValues = z.infer<typeof measurementSchema>;

const garmentTypes = ["Shirt", "Pant", "Kurta", "Blouse", "Suit", "Coat", "Custom"];
const defaultUnits = ["in", "cm"];

interface MeasurementFormProps {
  onSubmit: (data: MeasurementFormValues) => void;
  defaultValues?: Partial<MeasurementFormValues>;
  isLoading?: boolean;
  onCancel?: () => void;
}

export function MeasurementForm({ onSubmit, defaultValues, isLoading, onCancel }: MeasurementFormProps) {
  
  const form = useForm<MeasurementFormValues>({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      values: [{ name: "Chest", value: 0, unit: "in" }],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "values"
  });

  const watchType = form.watch("type");
  
  useEffect(() => {
    if (defaultValues) {
        form.reset({
            ...defaultValues,
            recordedDate: defaultValues.recordedDate && isValid(new Date(defaultValues.recordedDate)) ? new Date(defaultValues.recordedDate) : new Date(),
            deliveryDate: defaultValues.deliveryDate && isValid(new Date(defaultValues.deliveryDate)) ? new Date(defaultValues.deliveryDate) : null,
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
            name="customerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter customer's name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="uniqueId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unique Measurement ID</FormLabel>
                <div className="flex items-center gap-2">
                    <Barcode className="h-5 w-5 text-muted-foreground"/>
                    <FormControl>
                        <Input {...field} readOnly className="bg-muted cursor-not-allowed" />
                    </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Garment Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a garment type" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {garmentTypes.map(type => (
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
                  <FormLabel>Custom Garment Type Name</FormLabel>
                  <FormControl><Input placeholder="e.g., Sherwani" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="recordedDate"
            render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date Recorded</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PP") : (<span>Pick a date</span>)}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="deliveryDate"
            render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Delivery (Optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value && isValid(field.value) ? format(field.value, "PP") : (<span>Pick a date</span>)}
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
            )}
          />
        </div>
        
        <div>
          <Label>Measurement Values</Label>
          <div className="space-y-3 mt-2">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                <FormField control={form.control} name={`values.${index}.name`} render={({ field }) => (
                  <FormItem className="col-span-5"><FormControl><Input placeholder="e.g., Chest" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name={`values.${index}.value`} render={({ field }) => (
                  <FormItem className="col-span-3"><FormControl><Input type="number" step="0.1" placeholder="Value" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name={`values.${index}.unit`} render={({ field }) => (
                  <FormItem className="col-span-3">
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {defaultUnits.map(unit => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )}/>
                <Button type="button" variant="ghost" size="icon" className="col-span-1 text-destructive hover:bg-destructive/10" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", value: 0, unit: "in" })}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Field
            </Button>
          </div>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl><Textarea placeholder="Any additional notes about this measurement set..." {...field} /></FormControl>
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
