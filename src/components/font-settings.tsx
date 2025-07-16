
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { loadFromLocalStorage, saveToLocalStorage, type CustomFont, CUSTOM_FONTS_STORAGE_KEY } from "@/lib/localStorage";
import { PlusCircle, Trash2 } from "lucide-react";

export const FONT_STORAGE_KEY = "app-font";

// Define available fonts
export const AVAILABLE_FONTS: { [key: string]: string } = {
  "Inter": "Inter (Default)",
  "Roboto": "Roboto",
  "Open Sans": "Open Sans",
  "Montserrat": "Montserrat",
  "Poppins": "Poppins",
  "Lato": "Lato",
  "Nunito": "Nunito",
  "system": "System UI",
};

export const DEFAULT_FONT_KEY = "Inter";

export function FontSettings() {
  const [currentFontKey, setCurrentFontKey] = useState<string>(DEFAULT_FONT_KEY);
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  const [newFontUrl, setNewFontUrl] = useState("");
  const { toast } = useToast();

  const allAvailableFonts = useMemo(() => {
    const combined = { ...AVAILABLE_FONTS };
    customFonts.forEach(font => {
      combined[font.name] = `${font.name} (Custom)`;
    });
    return combined;
  }, [customFonts]);

  // Load font preferences on component mount
  useEffect(() => {
    const storedFontKey = localStorage.getItem(FONT_STORAGE_KEY) || DEFAULT_FONT_KEY;
    setCurrentFontKey(storedFontKey);
    
    const storedCustomFonts = loadFromLocalStorage<CustomFont[]>(CUSTOM_FONTS_STORAGE_KEY, []);
    setCustomFonts(storedCustomFonts);

    applyFont(storedFontKey);
  }, []);

  const applyFont = (fontKey: string) => {
    const htmlElement = document.documentElement;
    htmlElement.style.setProperty('--font-sans', `'${fontKey}', sans-serif`);
    localStorage.setItem(FONT_STORAGE_KEY, fontKey);
    setCurrentFontKey(fontKey);
  };

  const handleFontChange = (value: string) => {
    applyFont(value);
  };

  const handleAddCustomFont = () => {
    if (!newFontUrl.startsWith("https://fonts.googleapis.com/css2?family=")) {
      toast({ title: "Invalid URL", description: "Please use a valid Google Fonts URL.", variant: "destructive" });
      return;
    }
    try {
      const url = new URL(newFontUrl);
      const fontFamily = url.searchParams.get("family");
      if (!fontFamily) throw new Error("Font family not found in URL.");
      const fontName = fontFamily.split(':')[0].replace(/\+/g, ' ');

      if (allAvailableFonts[fontName]) {
        toast({ title: "Font Exists", description: `The font "${fontName}" is already in your list.`, variant: "destructive" });
        return;
      }

      const newFont: CustomFont = { name: fontName, url: newFontUrl };
      const updatedFonts = [...customFonts, newFont];
      setCustomFonts(updatedFonts);
      saveToLocalStorage(CUSTOM_FONTS_STORAGE_KEY, updatedFonts);
      window.dispatchEvent(new StorageEvent('storage', { key: CUSTOM_FONTS_STORAGE_KEY }));
      setNewFontUrl("");
      toast({ title: "Font Added", description: `"${fontName}" is now available in the font list.` });
    } catch (error) {
      toast({ title: "Error Parsing URL", description: "Could not extract font name from the URL.", variant: "destructive" });
    }
  };

  const handleRemoveCustomFont = (fontNameToRemove: string) => {
    const updatedFonts = customFonts.filter(font => font.name !== fontNameToRemove);
    setCustomFonts(updatedFonts);
    saveToLocalStorage(CUSTOM_FONTS_STORAGE_KEY, updatedFonts);
    window.dispatchEvent(new StorageEvent('storage', { key: CUSTOM_FONTS_STORAGE_KEY }));
    toast({ title: "Font Removed", description: `"${fontNameToRemove}" has been removed.` });

    if (currentFontKey === fontNameToRemove) {
      handleFontChange(DEFAULT_FONT_KEY);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Font Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="font-select">Application Font</Label>
          <Select value={currentFontKey} onValueChange={handleFontChange}>
            <SelectTrigger id="font-select"><SelectValue placeholder="Select a font" /></SelectTrigger>
            <SelectContent>
              {Object.entries(allAvailableFonts).map(([key, name]) => (
                <SelectItem key={key} value={key} style={{ fontFamily: `'${key}', sans-serif` }}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border-t pt-6 space-y-4">
            <h3 className="font-medium">Add Custom Google Font</h3>
            <div className="p-4 border border-blue-500/20 bg-blue-500/5 rounded-lg text-sm text-blue-800 dark:text-blue-200">
              <p className="font-bold">Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 mt-1">
                <li>Go to <a href="https://fonts.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Fonts</a>.</li>
                <li>Select a font family and its styles.</li>
                <li>Find the <code className="text-xs bg-muted p-1 rounded-sm">&lt;link&gt;</code> embed code.</li>
                <li>Copy the full <code className="text-xs bg-muted p-1 rounded-sm">href</code> URL from the code.</li>
                <li>Paste the URL below and click "Add Font".</li>
              </ol>
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-grow">
                <Label htmlFor="font-url">Google Font URL</Label>
                <Input id="font-url" placeholder="https://fonts.googleapis.com/css2?family=..." value={newFontUrl} onChange={e => setNewFontUrl(e.target.value)} />
              </div>
              <Button onClick={handleAddCustomFont} disabled={!newFontUrl}><PlusCircle className="mr-2 h-4 w-4" /> Add Font</Button>
            </div>
        </div>

        {customFonts.length > 0 && (
          <div className="space-y-2">
            <Label>Your Custom Fonts</Label>
            <div className="space-y-2 rounded-md border p-2">
              {customFonts.map(font => (
                <div key={font.name} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                  <span className="font-medium">{font.name}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveCustomFont(font.name)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 p-4 border rounded-lg" style={{ fontFamily: `'${currentFontKey}', sans-serif` }}>
          <h3 className="text-lg font-medium mb-2">Preview</h3>
          <p className="mb-3">This is how your selected font looks with regular text.</p>
          <h4 className="font-bold mb-2">Bold text example</h4>
          <p className="text-sm mb-2">Small text example with the selected font.</p>
          <p className="text-lg">Larger text example with the selected font.</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default FontSettings;
