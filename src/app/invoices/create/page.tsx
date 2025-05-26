
"use client"; 

import PageHeader from "@/components/page-header";
import { InvoiceForm, type InvoiceFormValues } from "@/components/invoice-form";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation"; 
import { useState } from "react";
import type { StoredInvoice } from "@/lib/database"; // Ensure StoredInvoice is imported
import { saveInvoice } from "@/lib/database-wrapper";

export default function CreateInvoicePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: InvoiceFormValues) => {
    setIsLoading(true);
    
    try {
      const itemsSubtotal = data.items.reduce((acc, item) => acc + (item.quantity || 0) * (item.price || 0), 0);
      let itemsTotalTax = 0;
      data.items.forEach(item => {
          const itemAmount = (item.quantity || 0) * (item.price || 0);
          if (item.applyIgst) {
              itemsTotalTax += itemAmount * ((item.igstRate || 0) / 100);
          } else if (item.applyCgst) { 
              itemsTotalTax += itemAmount * ((item.cgstRate || 0) / 100);
              itemsTotalTax += itemAmount * ((item.sgstRate || 0) / 100);
          }
      });
      let calculatedAmount = itemsSubtotal + itemsTotalTax;
      // This amount should ideally come directly from InvoiceForm's finalTotal if rounding is applied there.
      // For now, assume calculatedAmount is what we need.
      // If InvoiceForm has a way to expose its final rounded total, use that instead.

      const newInvoice: StoredInvoice = {
        ...data,
        id: data.invoiceNumber, 
        status: data.paymentStatus || "Unpaid", 
        amount: calculatedAmount,
        invoiceDate: new Date(data.invoiceDate), // Ensure it's a Date object
        dueDate: data.dueDate ? new Date(data.dueDate) : null, // Ensure Date or null
        shipmentDetails: data.shipmentDetails ? {
            ...data.shipmentDetails,
            shipDate: data.shipmentDetails.shipDate ? new Date(data.shipmentDetails.shipDate) : null,
            dateOfSupply: data.shipmentDetails.dateOfSupply ? new Date(data.shipmentDetails.dateOfSupply) : null,
            trackingNumber: data.shipmentDetails.trackingNumber || "",
            carrierName: data.shipmentDetails.carrierName || "",
            consigneeName: data.shipmentDetails.consigneeName || "",
            consigneeAddress: data.shipmentDetails.consigneeAddress || "",
            consigneeGstin: data.shipmentDetails.consigneeGstin || "",
            consigneeStateCode: data.shipmentDetails.consigneeStateCode || "",
            transportationMode: data.shipmentDetails.transportationMode || "",
            lrNo: data.shipmentDetails.lrNo || "",
            vehicleNo: data.shipmentDetails.vehicleNo || "",
            placeOfSupply: data.shipmentDetails.placeOfSupply || ""
        } : { 
            shipDate: null, trackingNumber: "", carrierName: "", consigneeName: "", consigneeAddress: "",
            consigneeGstin: "", consigneeStateCode: "", transportationMode: "", lrNo: "", vehicleNo: "",
            dateOfSupply: null, placeOfSupply: ""
        },
      };

      const success = await saveInvoice(newInvoice);
      
      if (success) {
        toast({
          title: "Invoice Created",
          description: `Invoice ${data.invoiceNumber} has been successfully created and saved.`,
        });
        router.push("/invoices");
      } else {
        throw new Error("Failed to save invoice to database");
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast({
        title: "Error",
        description: "Failed to create invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/invoices");
  };

  // Default values for a new invoice
  const defaultNewInvoiceValues: Partial<InvoiceFormValues> = {
    invoiceDate: new Date(), // Will be set properly in InvoiceForm's useEffect
    dueDate: null, 
    items: [{
      productId: "",
      description: "",
      quantity: 1,
      price: 0,
      gstCategory: "",
      applyIgst: true,
      applyCgst: false,
      applySgst: false,
      igstRate: 18,
      cgstRate: 9,
      sgstRate: 9
    }],
    customerId: "",
    customerName: "",
    customerEmail: "",
    customerAddress: "",
    invoiceNumber: "", // Will be generated in InvoiceForm
    notes: "",
    termsAndConditions: "Payment due within 30 days. All goods remain property of the seller until paid in full.",
    paymentStatus: "Unpaid",
    paymentMethod: "",
    shipmentDetails: {
      shipDate: null, trackingNumber: "", carrierName: "", consigneeName: "", consigneeAddress: "",
      consigneeGstin: "", consigneeStateCode: "", transportationMode: "", lrNo: "", vehicleNo: "",
      dateOfSupply: null, placeOfSupply: ""
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Create New Invoice" description="Fill in the details below to create a new invoice." />
      <InvoiceForm 
        onSubmit={handleSubmit} 
        defaultValues={defaultNewInvoiceValues}
        isLoading={isLoading}
        onCancel={handleCancel}
      />
    </div>
  );
}
