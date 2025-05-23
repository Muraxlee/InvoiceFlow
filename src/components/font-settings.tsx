"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const FONT_STORAGE_KEY = "app-font";

// Define available fonts
export const AVAILABLE_FONTS = {
  "inter": "Inter (Default)",
  "roboto": "Roboto",
  "open-sans": "Open Sans",
  "montserrat": "Montserrat",
  "poppins": "Poppins",
  "lato": "Lato",
  "nunito": "Nunito",
  "system": "System UI",
};

export const DEFAULT_FONT_KEY = "inter";

export function FontSettings() {
  const [currentFontKey, setCurrentFontKey] = useState<string>(DEFAULT_FONT_KEY);

  // Load font preference on component mount
  useEffect(() => {
    const storedFontKey = localStorage.getItem(FONT_STORAGE_KEY);
    if (storedFontKey && AVAILABLE_FONTS[storedFontKey as keyof typeof AVAILABLE_FONTS]) {
      setCurrentFontKey(storedFontKey);
      applyFont(storedFontKey);
    } else {
      applyFont(DEFAULT_FONT_KEY);
    }
  }, []);

  // Apply font to document
  const applyFont = (fontKey: string) => {
    const htmlElement = document.documentElement;
    
    // Remove all existing font classes
    Object.keys(AVAILABLE_FONTS).forEach(key => {
      htmlElement.classList.remove(`font-${key}`);
    });
    
    // Add selected font class
    if (fontKey !== "system") {
      htmlElement.classList.add(`font-${fontKey}`);
      
      // Apply font directly to body for better compatibility
      document.body.style.fontFamily = fontKey === "system" 
        ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif"
        : `'${fontKey.charAt(0).toUpperCase() + fontKey.slice(1)}', sans-serif`;
    } else {
      // Reset body font for system font
      document.body.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif";
    }
    
    // Store the preference
    localStorage.setItem(FONT_STORAGE_KEY, fontKey);
    setCurrentFontKey(fontKey);
  };

  const handleFontChange = (value: string) => {
    applyFont(value);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Font Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="font-select">Application Font</Label>
          <Select 
            value={currentFontKey} 
            onValueChange={handleFontChange}
          >
            <SelectTrigger id="font-select">
              <SelectValue placeholder="Select a font" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(AVAILABLE_FONTS).map(([key, name]) => (
                <SelectItem key={key} value={key}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-1">
            The selected font will be applied throughout the application.
          </p>
        </div>

        {/* Font preview section */}
        <div className="mt-6 p-4 border rounded-lg">
          <h3 className="text-lg font-medium mb-2">Preview</h3>
          <p className="mb-3">
            This is how your selected font looks with regular text.
          </p>
          <h4 className="font-bold mb-2">Bold text example</h4>
          <p className="text-sm mb-2">
            Small text example with the selected font.
          </p>
          <p className="text-lg">
            Larger text example with the selected font.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default FontSettings; 