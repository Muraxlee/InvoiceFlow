'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InvoiceForm, type InvoiceFormValues } from '@/components/invoice-form';
import { InvoicePrint } from '@/components/invoice-print';
import { ArrowLeft, Pencil, Save, Printer, CalendarDays, Info, Truck, Anchor, UserCircle, Banknote, PackageSearch, FileText, Loader2Icon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { type StoredInvoice } from '@/lib/database';
import { getInvoiceById, saveInvoice, getCompanyInfo } from '@/lib/database-wrapper';
import { format as formatDateFns, isValid } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<StoredInvoice | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("view");

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const tab = queryParams.get('tab');
    if (tab === 'print') {
      setActiveTab('print');
    }

    async function loadData() {
      setIsLoading(true);
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
    
    if (params.id) {
      loadData();
    }
  }, [params.id, router, toast]);

  const handleSave = async (data: InvoiceFormValues) => {
    if (!invoice) return;
    setIsLoading(true);
    try {
      // Recalculate total amount before saving
      const subtotal = data.items.reduce((acc, item) => acc + (item.quantity || 0) * (item.price || 0), 0);
      let totalTaxAmount = 0;
      data.items.forEach(item => {
        const itemAmount = (item.quantity || 0) * (item.price || 0);
        if (item.applyIgst) {
          totalTaxAmount += itemAmount * ((item.igstRate || 0) / 100);
        } else {
          totalTaxAmount += itemAmount * ((item.cgstRate || 0) / 100);
          totalTaxAmount += itemAmount * ((item.sgstRate || 0) / 100);
        }
      });
      const totalAmount = subtotal + totalTaxAmount;
      
      // Apply rounding if roundOffApplied is true
      const finalAmount = data.roundOffApplied ? Math.round(totalAmount) : totalAmount;

      const updatedInvoice: StoredInvoice = {
        ...invoice, // Spread existing invoice to keep ID and other non-form fields
        ...data,    // Spread form data
        amount: finalAmount, // Set the recalculated amount
        roundOffApplied: data.roundOffApplied // Make sure roundOffApplied is preserved
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
      toast({ title: 'Error', description: 'Failed to save invoice changes', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const statusVariant = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case "paid": return "success";
      case "pending": case "unpaid": return "warning";
      case "overdue": return "destructive";
      case "draft": return "outline";
      default: return "secondary";
    }
  };

  const DetailItem = ({ label, value, icon }: { label: string; value: string | React.ReactNode; icon?: React.ElementType }) => {
    const Icon = icon;
    return (
      <div className="flex flex-col">
        <dt className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          {Icon && <Icon className="h-3.5 w-3.5" />} {label}
        </dt>
        <dd className="text-sm">{value || '-'}</dd>
      </div>
    );
  };
  
  const { subtotal, igstAmount, cgstAmount, sgstAmount, totalTax, total, finalTotal, roundOffDifference } = (() => {
    if (!invoice) return { 
      subtotal: 0, igstAmount: 0, cgstAmount: 0, sgstAmount: 0, 
      totalTax: 0, total: 0, finalTotal: 0, roundOffDifference: 0 
    };
    
    const currentItems = invoice.items || [];
    const sub = currentItems.reduce((acc: number, item: any) => acc + (item.quantity || 0) * (item.price || 0), 0);
    let igst = 0, cgst = 0, sgst = 0;
    
    currentItems.forEach((item: any) => {
      const itemAmount = (item.quantity || 0) * (item.price || 0);
      if (item.applyIgst) igst += itemAmount * ((item.igstRate || 0) / 100);
      if (item.applyCgst) cgst += itemAmount * ((item.cgstRate || 0) / 100);
      if (item.applySgst) sgst += itemAmount * ((item.sgstRate || 0) / 100);
    });
    
    const tax = igst + cgst + sgst;
    const totalBeforeRound = sub + tax;
    let roundOff = 0;
    let finalAmount = totalBeforeRound;
    
    // Apply rounding if roundOffApplied is true
    if (invoice.roundOffApplied) {
      finalAmount = Math.round(totalBeforeRound);
      roundOff = finalAmount - totalBeforeRound;
    }
    
    return {
      subtotal: sub,
      igstAmount: igst,
      cgstAmount: cgst, 
      sgstAmount: sgst,
      totalTax: tax,
      total: totalBeforeRound,
      finalTotal: finalAmount,
      roundOffDifference: roundOff
    };
  })();

  if (isLoading && !invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Invoice Not Found" 
          description="The requested invoice could not be found or you do not have permission to view it."
          actions={
            <Link href="/invoices">
              <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices</Button>
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
              <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
            </Link>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)}><Pencil className="mr-2 h-4 w-4" /> Edit Invoice</Button>
            )}
            {isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isLoading}>
                Cancel
              </Button>
            )}
          </div>
        }
      />

      {isEditing ? (
        <Card className="p-4 md:p-6">
           <InvoiceForm 
            onSubmit={handleSave} 
            defaultValues={invoice} // Pass the full StoredInvoice; InvoiceForm will pick what it needs
            isLoading={isLoading} 
            onCancel={() => setIsEditing(false)}
          />
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="view">View Details</TabsTrigger>
            <TabsTrigger value="print">Print Preview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="view" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Invoice Summary</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
                  <DetailItem label="Invoice #" value={invoice.invoiceNumber} icon={FileText} />
                  <DetailItem label="Invoice Date" value={isValid(new Date(invoice.invoiceDate)) ? formatDateFns(new Date(invoice.invoiceDate), 'PP') : 'N/A'} icon={CalendarDays} />
                  <DetailItem label="Due Date" value={isValid(new Date(invoice.dueDate)) ? formatDateFns(new Date(invoice.dueDate), 'PP') : 'N/A'} icon={CalendarDays} />
                  <DetailItem label="Status" value={<Badge variant={statusVariant(invoice.status) as any}>{invoice.status}</Badge>} icon={Info}/>
                  <DetailItem label="Payment Method" value={invoice.paymentMethod || 'N/A'} icon={Banknote} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Customer Information</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                  <DetailItem label="Name" value={invoice.customerName} icon={UserCircle} />
                  <DetailItem label="Email" value={invoice.customerEmail} />
                  <DetailItem label="GSTIN" value={invoice.customerGstin || 'N/A'} />
                  <DetailItem label="Billing Address" value={invoice.customerAddress} />
                  <DetailItem label="State/Code" value={invoice.customerState && invoice.customerStateCode ? `${invoice.customerState} / ${invoice.customerStateCode}` : 'N/A'} />
                </dl>
              </CardContent>
            </Card>
            
            {invoice.shipmentDetails && (invoice.shipmentDetails.consigneeName || invoice.shipmentDetails.transportationMode) && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Shipment & Transport Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-md font-medium mb-2 text-muted-foreground flex items-center gap-1"><UserCircle className="h-4 w-4" /> Consignee (Shipped To)</h4>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 ml-2 pl-4 border-l">
                      <DetailItem label="Name" value={invoice.shipmentDetails.consigneeName} />
                      <DetailItem label="Address" value={invoice.shipmentDetails.consigneeAddress} />
                      <DetailItem label="GSTIN" value={invoice.shipmentDetails.consigneeGstin} />
                      <DetailItem label="State/Code" value={invoice.shipmentDetails.consigneeStateCode} />
                    </dl>
                  </div>
                  <div className="pt-3">
                    <h4 className="text-md font-medium mb-2 text-muted-foreground flex items-center gap-1"><Truck className="h-4 w-4" /> Transport Information</h4>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 ml-2 pl-4 border-l">
                      <DetailItem label="Mode" value={invoice.shipmentDetails.transportationMode} />
                      <DetailItem label="Date of Supply" value={invoice.shipmentDetails.dateOfSupply ? formatDateFns(new Date(invoice.shipmentDetails.dateOfSupply), 'PP') : 'N/A'} />
                      <DetailItem label="LR No." value={invoice.shipmentDetails.lrNo} />
                      <DetailItem label="Vehicle No." value={invoice.shipmentDetails.vehicleNo} />
                      <DetailItem label="Carrier Name" value={invoice.shipmentDetails.carrierName} />
                      <DetailItem label="Tracking No." value={invoice.shipmentDetails.trackingNumber} />
                      <DetailItem label="Ship Date" value={invoice.shipmentDetails.shipDate ? formatDateFns(new Date(invoice.shipmentDetails.shipDate), 'PP') : 'N/A'} />
                       <DetailItem label="Place of Supply" value={invoice.shipmentDetails.placeOfSupply} />
                    </dl>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-1"><PackageSearch className="h-5 w-5" />Invoice Items</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">#</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Product Name</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs">Qty</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs">Price (₹)</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item, index) => (
                        <tr key={index} className="border-b last:border-b-0">
                          <td className="py-3 px-3 text-sm">{index + 1}</td>
                          <td className="py-3 px-3 text-sm">
                            {item.productName || item.description || item.productId || 'N/A'}
                          </td>
                          <td className="text-right py-3 px-3 text-sm">{item.quantity}</td>
                          <td className="text-right py-3 px-3 text-sm">{(item.price || 0).toFixed(2)}</td>
                          <td className="text-right py-3 px-3 text-sm font-medium">{((item.quantity || 0) * (item.price || 0)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                 <div className="mt-6 flex justify-end">
                    <div className="w-full max-w-xs space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span> <span>₹{subtotal.toFixed(2)}</span></div>
                        {igstAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">IGST:</span> <span>₹{igstAmount.toFixed(2)}</span></div>}
                        {cgstAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">CGST:</span> <span>₹{cgstAmount.toFixed(2)}</span></div>}
                        {sgstAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">SGST:</span> <span>₹{sgstAmount.toFixed(2)}</span></div>}
                        <div className="flex justify-between text-md font-semibold border-t pt-1 mt-1"><span>Total Before Round Off:</span> <span>₹{total.toFixed(2)}</span></div>
                        {invoice.roundOffApplied && roundOffDifference !== 0 && (
                          <div className="flex justify-between"><span className="text-muted-foreground">Round Off:</span> <span>{roundOffDifference >= 0 ? '+' : ''}₹{roundOffDifference.toFixed(2)}</span></div>
                        )}
                        <div className="flex justify-between text-md font-bold border-t pt-1 mt-1"><span>Grand Total:</span> <span>₹{finalTotal.toFixed(2)}</span></div>
                    </div>
                </div>
              </CardContent>
            </Card>
            
            {(invoice.notes || invoice.termsAndConditions) && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Additional Information</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {invoice.notes && (
                    <div>
                      <h3 className="text-md font-medium mb-1 text-muted-foreground">Notes</h3>
                      <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
                    </div>
                  )}
                  {invoice.termsAndConditions && (
                    <div>
                      <h3 className="text-md font-medium mb-1 text-muted-foreground">Terms & Conditions</h3>
                      <p className="text-sm whitespace-pre-wrap">{invoice.termsAndConditions}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="print">
            <Card className="p-6">
              {companyInfo ? (
                <InvoicePrint 
                  invoice={invoice} 
                  company={companyInfo}
                />
              ) : (
                <p className="text-center text-muted-foreground">Company information not loaded. Cannot generate print preview.</p>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

    