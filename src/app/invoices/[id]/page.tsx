'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InvoiceForm, type InvoiceFormValues } from '@/components/invoice-form';
import { InvoicePrint } from '@/components/invoice-print';
import { ArrowLeft, Pencil, Save, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { type StoredInvoice } from '@/lib/database';
import { getInvoiceById, saveInvoice, getCompanyInfo } from '@/lib/database-wrapper';

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<StoredInvoice | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const invoiceData = await getInvoiceById(params.id);
        if (!invoiceData) {
          toast({
            title: 'Invoice Not Found',
            description: `Could not find invoice with ID ${params.id}`,
            variant: 'destructive',
          });
          router.push('/invoices');
          return;
        }
        
        setInvoice(invoiceData);
        
        const company = await getCompanyInfo();
        setCompanyInfo(company);
      } catch (error) {
        console.error('Error loading invoice:', error);
        toast({
          title: 'Error',
          description: 'Failed to load invoice data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [params.id, router, toast]);

  const handleSave = async (data: InvoiceFormValues) => {
    if (!invoice) return;
    
    setIsLoading(true);
    
    try {
      const updatedInvoice: StoredInvoice = {
        ...invoice,
        ...data,
      };
      
      const success = await saveInvoice(updatedInvoice);
      
      if (success) {
        setInvoice(updatedInvoice);
        setIsEditing(false);
        toast({
          title: 'Invoice Updated',
          description: `Invoice ${updatedInvoice.invoiceNumber} has been updated successfully.`,
        });
      } else {
        throw new Error('Failed to save invoice');
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to save invoice changes',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Invoice Not Found" 
          description="The requested invoice could not be found."
          actions={
            <Link href="/invoices">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title={isEditing ? `Edit Invoice ${invoice.invoiceNumber}` : `Invoice ${invoice.invoiceNumber}`}
        description={isEditing ? "Make changes to this invoice" : `View and manage invoice details for ${invoice.customerName}`}
        actions={
          <div className="flex gap-2">
            <Link href="/invoices">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            </Link>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit Invoice
              </Button>
            )}
          </div>
        }
      />

      {isEditing ? (
        <Card className="p-6">
          <InvoiceForm 
            onSubmit={handleSave} 
            defaultValues={invoice}
            isLoading={isLoading} 
          />
        </Card>
      ) : (
        <Tabs defaultValue="view">
          <TabsList className="mb-4">
            <TabsTrigger value="view">View Details</TabsTrigger>
            <TabsTrigger value="print">Print Preview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="view" className="space-y-6">
            <Card className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Customer Information</h3>
                  <div className="space-y-1">
                    <p><span className="font-medium">Name:</span> {invoice.customerName}</p>
                    {invoice.customerEmail && (
                      <p><span className="font-medium">Email:</span> {invoice.customerEmail}</p>
                    )}
                    {invoice.customerAddress && (
                      <p><span className="font-medium">Address:</span> {invoice.customerAddress}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Invoice Details</h3>
                  <div className="space-y-1">
                    <p><span className="font-medium">Invoice Number:</span> {invoice.invoiceNumber}</p>
                    <p><span className="font-medium">Date:</span> {invoice.invoiceDate.toLocaleDateString()}</p>
                    <p><span className="font-medium">Due Date:</span> {invoice.dueDate.toLocaleDateString()}</p>
                    <p><span className="font-medium">Status:</span> {invoice.status}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Invoice Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-1">Description</th>
                        <th className="text-right py-2 px-1">Quantity</th>
                        <th className="text-right py-2 px-1">Price</th>
                        <th className="text-right py-2 px-1">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-2 px-1">{item.description}</td>
                          <td className="text-right py-2 px-1">{item.quantity}</td>
                          <td className="text-right py-2 px-1">₹{(item.price || 0).toFixed(2)}</td>
                          <td className="text-right py-2 px-1">₹{((item.quantity || 0) * (item.price || 0)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th colSpan={3} className="text-right py-2 px-1">Subtotal:</th>
                        <td className="text-right py-2 px-1 font-medium">₹{invoice.items.reduce((sum, item) => sum + (item.quantity || 0) * (item.price || 0), 0).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <th colSpan={3} className="text-right py-2 px-1">Tax (18%):</th>
                        <td className="text-right py-2 px-1 font-medium">₹{(invoice.items.reduce((sum, item) => sum + (item.quantity || 0) * (item.price || 0), 0) * 0.18).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <th colSpan={3} className="text-right py-2 px-1">Total:</th>
                        <td className="text-right py-2 px-1 font-semibold">₹{(invoice.items.reduce((sum, item) => sum + (item.quantity || 0) * (item.price || 0), 0) * 1.18).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              
              {(invoice.notes || invoice.termsAndConditions) && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {invoice.notes && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Notes</h3>
                      <p className="text-sm text-gray-600">{invoice.notes}</p>
                    </div>
                  )}
                  {invoice.termsAndConditions && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Terms & Conditions</h3>
                      <p className="text-sm text-gray-600">{invoice.termsAndConditions}</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>
          
          <TabsContent value="print">
            <Card className="p-6">
              <InvoicePrint 
                invoice={invoice} 
                company={companyInfo}
              />
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
} 