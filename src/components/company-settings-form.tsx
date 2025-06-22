
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { saveCompanyInfo } from '@/lib/firestore-actions';
import { COMPANY_NAME_STORAGE_KEY, saveToLocalStorage } from '@/lib/localStorage';
import { type CompanyInfo } from '@/types/database';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

const companySchema = z.object({
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

export function CompanySettingsForm({ defaultValues, onSuccess }: CompanySettingsFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: defaultValues || {},
  });

  const mutation = useMutation({
    mutationFn: saveCompanyInfo,
    onSuccess: (_, variables) => {
      toast({
        title: 'Settings Saved',
        description: 'Company information has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['companyInfo'] });

      // Also update the company name in local storage for the app title
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

  async function onSubmit(data: CompanyFormValues) {
    mutation.mutate(data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Information</CardTitle>
        <CardDescription>
          Update your company details that will appear on invoices
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Company Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="contact@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+91 1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondary Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="+91 0987654321" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="gstin"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>GST Number (GSTIN)</FormLabel>
                    <FormControl>
                      <Input placeholder="22AAAAA0000A1Z5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Full address with city, state and pincode" 
                      className="min-h-[100px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Banking Details</h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                 <FormField
                  control={form.control}
                  name="bank_account_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Holder Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Your Company Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bank_account"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank A/C No</FormLabel>
                      <FormControl>
                        <Input placeholder="1234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bank_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., HDFC Bank" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bank_ifsc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank IFSC</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., HDFC0001234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                type="submit" 
                disabled={mutation.isPending || !form.formState.isDirty}
              >
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
