
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  loadFromLocalStorage, 
  saveToLocalStorage, 
  CUSTOM_GARMENT_TYPES_STORAGE_KEY, 
  CUSTOM_MEASUREMENT_FIELDS_STORAGE_KEY,
  DEFAULT_GARMENT_TYPES,
  DEFAULT_MEASUREMENT_FIELDS,
} from "@/lib/localStorage";
import { PlusCircle, Trash2 } from "lucide-react";
import { ScrollArea } from '@/components/ui/scroll-area';

export function MeasurementSettings() {
  const { toast } = useToast();
  
  const [customGarmentTypes, setCustomGarmentTypes] = useState<string[]>([]);
  const [newGarmentType, setNewGarmentType] = useState("");

  const [customMeasurementFields, setCustomMeasurementFields] = useState<string[]>([]);
  const [newMeasurementField, setNewMeasurementField] = useState("");

  useEffect(() => {
    // On first load, if localStorage is empty, populate it with defaults.
    const storedGarmentTypes = loadFromLocalStorage<string[]>(CUSTOM_GARMENT_TYPES_STORAGE_KEY, null);
    if (storedGarmentTypes === null) {
        saveToLocalStorage(CUSTOM_GARMENT_TYPES_STORAGE_KEY, DEFAULT_GARMENT_TYPES);
        setCustomGarmentTypes(DEFAULT_GARMENT_TYPES);
    } else {
        setCustomGarmentTypes(storedGarmentTypes);
    }

    const storedMeasurementFields = loadFromLocalStorage<string[]>(CUSTOM_MEASUREMENT_FIELDS_STORAGE_KEY, null);
    if (storedMeasurementFields === null) {
        saveToLocalStorage(CUSTOM_MEASUREMENT_FIELDS_STORAGE_KEY, DEFAULT_MEASUREMENT_FIELDS);
        setCustomMeasurementFields(DEFAULT_MEASUREMENT_FIELDS);
    } else {
        setCustomMeasurementFields(storedMeasurementFields);
    }
  }, []);

  const handleAddGarmentType = () => {
    const trimmedType = newGarmentType.trim();
    if (trimmedType === "") return;
    if (customGarmentTypes.includes(trimmedType)) {
      toast({ title: "Duplicate", description: "This garment type already exists.", variant: "destructive" });
      return;
    }
    const updatedTypes = [...customGarmentTypes, trimmedType];
    setCustomGarmentTypes(updatedTypes);
    saveToLocalStorage(CUSTOM_GARMENT_TYPES_STORAGE_KEY, updatedTypes);
    window.dispatchEvent(new StorageEvent('storage', { key: CUSTOM_GARMENT_TYPES_STORAGE_KEY, newValue: JSON.stringify(updatedTypes) }));
    setNewGarmentType("");
    toast({ title: "Garment Type Added" });
  };

  const handleRemoveGarmentType = (typeToRemove: string) => {
    const updatedTypes = customGarmentTypes.filter(type => type !== typeToRemove);
    setCustomGarmentTypes(updatedTypes);
    saveToLocalStorage(CUSTOM_GARMENT_TYPES_STORAGE_KEY, updatedTypes);
    window.dispatchEvent(new StorageEvent('storage', { key: CUSTOM_GARMENT_TYPES_STORAGE_KEY, newValue: JSON.stringify(updatedTypes) }));
    toast({ title: "Garment Type Removed" });
  };

  const handleAddMeasurementField = () => {
    const trimmedField = newMeasurementField.trim();
    if (trimmedField === "") return;
    if (customMeasurementFields.includes(trimmedField)) {
      toast({ title: "Duplicate", description: "This measurement field already exists.", variant: "destructive" });
      return;
    }
    const updatedFields = [...customMeasurementFields, trimmedField];
    setCustomMeasurementFields(updatedFields);
    saveToLocalStorage(CUSTOM_MEASUREMENT_FIELDS_STORAGE_KEY, updatedFields);
    window.dispatchEvent(new StorageEvent('storage', { key: CUSTOM_MEASUREMENT_FIELDS_STORAGE_KEY, newValue: JSON.stringify(updatedFields) }));
    setNewMeasurementField("");
    toast({ title: "Measurement Field Added" });
  };

  const handleRemoveMeasurementField = (fieldToRemove: string) => {
    const updatedFields = customMeasurementFields.filter(field => field !== fieldToRemove);
    setCustomMeasurementFields(updatedFields);
    saveToLocalStorage(CUSTOM_MEASUREMENT_FIELDS_STORAGE_KEY, updatedFields);
    window.dispatchEvent(new StorageEvent('storage', { key: CUSTOM_MEASUREMENT_FIELDS_STORAGE_KEY, newValue: JSON.stringify(updatedFields) }));
    toast({ title: "Measurement Field Removed" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Measurement Settings</CardTitle>
        <CardDescription>Manage custom garment types and measurement fields for suggestions.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-medium">Custom Garment Types</h3>
          <div className="flex gap-2">
            <Input 
              value={newGarmentType}
              onChange={(e) => setNewGarmentType(e.target.value)}
              placeholder="e.g., Blazer, Lehenga"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddGarmentType(); }}
            />
            <Button onClick={handleAddGarmentType} size="icon" variant="outline"><PlusCircle className="h-4 w-4" /></Button>
          </div>
          <ScrollArea className="h-40 rounded-md border p-2">
            {customGarmentTypes.length > 0 ? (
              customGarmentTypes.map(type => (
                <div key={type} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 text-sm">
                  <span>{type}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/80" onClick={() => handleRemoveGarmentType(type)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-muted-foreground pt-4">No custom garment types added yet.</p>
            )}
          </ScrollArea>
        </div>
        <div className="space-y-4">
          <h3 className="font-medium">Custom Measurement Fields</h3>
          <div className="flex gap-2">
            <Input 
              value={newMeasurementField}
              onChange={(e) => setNewMeasurementField(e.target.value)}
              placeholder="e.g., Collar, Ankle"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddMeasurementField(); }}
            />
            <Button onClick={handleAddMeasurementField} size="icon" variant="outline"><PlusCircle className="h-4 w-4" /></Button>
          </div>
          <ScrollArea className="h-40 rounded-md border p-2">
            {customMeasurementFields.length > 0 ? (
              customMeasurementFields.map(field => (
                <div key={field} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 text-sm">
                  <span>{field}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/80" onClick={() => handleRemoveMeasurementField(field)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-muted-foreground pt-4">No custom fields added yet.</p>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

export default MeasurementSettings;
