
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { saveCompanyInfo } from '@/lib/firestore-actions';
import { COMPANY_NAME_STORAGE_KEY, saveToLocalStorage } from '@/lib/localStorage';
import { type CompanyInfo } from '@/types/database';
import { useState, useRef } from 'react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const companySchema = z.object({
  logo: z.string().optional(),
  name: z.string().min(1, 'Company name is required'),
  address: z.string().min(1, 'Company address is required'),
  phone: z.string().min(1, 'Primary phone number is required'),
  phone2: z.string().optional(),
  email: z.string().email('Invalid email address'),
  gstin: z.string().optional(),
  bank_account_name: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  bank_ifsc: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

interface CompanySettingsFormProps {
  defaultValues: Partial<CompanyInfo>;
  onSuccess?: () => void;
}

const MAX_FILE_SIZE_MB = 2;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function CompanySettingsForm({ defaultValues, onSuccess }: CompanySettingsFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | undefined>(defaultValues?.logo);
  
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: { ...defaultValues, logo: defaultValues?.logo || '' } || {},
  });

  const mutation = useMutation({
    mutationFn: saveCompanyInfo,
    onSuccess: (_, variables) => {
      toast({
        title: 'Settings Saved',
        description: 'Company information has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['companyInfo'] });

      if (variables.name) {
        saveToLocalStorage(COMPANY_NAME_STORAGE_KEY, variables.name);
        window.dispatchEvent(new StorageEvent('storage', { key: COMPANY_NAME_STORAGE_KEY, newValue: JSON.stringify(variables.name) }));
      }
      onSuccess?.();
    },
    onError: (error) => {
       toast({
        title: 'Error',
        description: 'Failed to save company information. Please try again.',
        variant: 'destructive',
      });
    }
  });

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({ title: "File too large", description: `Please select an image smaller than ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please select a JPG, PNG, or WEBP image.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL(file.type, 0.8); // 80% quality
        setLogoPreview(dataUrl);
        form.setValue('logo', dataUrl, { shouldDirty: true });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  async function onSubmit(data: CompanyFormValues) {
    mutation.mutate(data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Information</CardTitle>
        <CardDescription>
          Update your company details and logo that will appear on invoices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                <div className="relative h-24 w-24 rounded-lg border bg-muted/50 flex items-center justify-center overflow-hidden">
                  {logoPreview ? (
                    <Image src={logoPreview} alt="Company Logo" layout="fill" objectFit="contain" />
                  ) : (
                    <span className="text-xs text-muted-foreground">No Logo</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Input ref={fileInputRef} type="file" className="hidden" accept={ACCEPTED_IMAGE_TYPES.join(",")} onChange={handleLogoChange} />
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Upload Logo</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setLogoPreview(undefined); form.setValue('logo', '', { shouldDirty: true }); }}>Remove Logo</Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Recommended: Square logo. Max ${MAX_FILE_SIZE_MB}MB. Will be resized to 400px width.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Company Name</FormLabel> <FormControl><Input placeholder="Your Company Name" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={form.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email Address</FormLabel> <FormControl><Input placeholder="contact@company.com" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem> <FormLabel>Primary Phone</FormLabel> <FormControl><Input placeholder="+91 1234567890" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={form.control} name="phone2" render={({ field }) => ( <FormItem> <FormLabel>Secondary Phone (Optional)</FormLabel> <FormControl><Input placeholder="+91 0987654321" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={form.control} name="gstin" render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel>GST Number (GSTIN)</FormLabel> <FormControl><Input placeholder="22AAAAA0000A1Z5" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            </div>

            <FormField control={form.control} name="address" render={({ field }) => ( <FormItem> <FormLabel>Company Address</FormLabel> <FormControl><Textarea placeholder="Full address with city, state and pincode" className="min-h-[100px]" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Banking Details</h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                 <FormField control={form.control} name="bank_account_name" render={({ field }) => (<FormItem><FormLabel>Account Holder Name</FormLabel><FormControl><Input placeholder="e.g., Your Company Name" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="bank_account" render={({ field }) => (<FormItem><FormLabel>Bank A/C No</FormLabel><FormControl><Input placeholder="1234567890" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="bank_name" render={({ field }) => (<FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input placeholder="e.g., HDFC Bank" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="bank_ifsc" render={({ field }) => (<FormItem><FormLabel>Bank IFSC</FormLabel><FormControl><Input placeholder="e.g., HDFC0001234" {...field} /></FormControl><FormMessage /></FormItem>)}/>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={mutation.isPending || !form.formState.isDirty}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
