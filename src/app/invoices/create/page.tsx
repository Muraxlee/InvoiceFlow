
"use client"; 

import PageHeader from "@/components/page-header";
import { InvoiceForm, type InvoiceFormValues } from "@/components/invoice-form";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation"; 
import { useState } from "react";
import { StoredInvoice } from "@/lib/database";
import { saveInvoice } from "@/lib/database-wrapper";

export default function CreateInvoicePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: InvoiceFormValues) => {
    setIsLoading(true);
    
    try {
      // Recalculate total based on items and potential round-off
      const subtotal = data.items.reduce((acc, item) => acc + (item.quantity || 0) * (item.price || 0), 0);
      let totalTaxAmount = 0;
      data.items.forEach(item => {
        const itemAmount = (item.quantity || 0) * (item.price || 0);
        if (item.applyIgst) {
          totalTaxAmount += itemAmount * ((item.igstRate || 0) / 100);
        } else if (item.applyCgst) { // CGST and SGST are applied together
          totalTaxAmount += itemAmount * ((item.cgstRate || 0) / 100);
          totalTaxAmount += itemAmount * ((item.sgstRate || 0) / 100);
        }
      });
      let finalAmount = subtotal + totalTaxAmount;

      // Check if round-off was applied (this logic needs to be passed from InvoiceForm or re-evaluated)
      // For simplicity, if a `roundOffAmount` was somehow passed or calculated:
      // finalAmount = Math.round(finalAmount); // This line might need to reflect how InvoiceForm handles it.
      // Let's assume InvoiceForm passes the already-rounded amount or it's calculated from finalTotal in the form.
      // The `data` object from InvoiceForm should ideally already contain the final, potentially rounded, total.
      // The StoredInvoice amount will be derived from the calculation in InvoiceForm.
      // The form's `onSubmit` should pass the final calculated amount in the `data`.
      // The `StoredInvoice` `amount` will be set from the `finalTotal` calculated in InvoiceForm.

      const newInvoice: StoredInvoice = {
        ...data,
        id: data.invoiceNumber, 
        status: data.paymentStatus || "Unpaid", 
        amount: data.items.reduce((acc, item) => acc + ((item.quantity || 0) * (item.price || 0) * (1 + 
          (item.applyIgst ? (item.igstRate || 0) / 100 : 0) +
          (item.applyCgst ? (item.cgstRate || 0) / 100 : 0) +
          (item.applySgst ? (item.sgstRate || 0) / 100 : 0)
        )), 0), // Temporary recalculation, ideally form passes final amount
        dueDate: data.dueDate, // dueDate is now potentially null
        shipmentDetails: data.shipmentDetails || { 
            shipDate: null, trackingNumber: "", carrierName: "",
            consigneeName: "", consigneeAddress: "", consigneeGstin: "", consigneeStateCode: "",
            transportationMode: "", lrNo: "", vehicleNo: "", dateOfSupply: null, placeOfSupply: ""
        },
      };
       // Re-calculate final amount based on items and round-off logic to be consistent with form display
        const itemsSubtotal = newInvoice.items.reduce((acc, item) => acc + (item.quantity || 0) * (item.price || 0), 0);
        let itemsTotalTax = 0;
        newInvoice.items.forEach(item => {
            const itemAmount = (item.quantity || 0) * (item.price || 0);
            if (item.applyIgst) {
                itemsTotalTax += itemAmount * ((item.igstRate || 0) / 100);
            } else if (item.applyCgst) { // Assuming if applyCgst is true, applySgst is also true for paired GST
                itemsTotalTax += itemAmount * ((item.cgstRate || 0) / 100);
                itemsTotalTax += itemAmount * ((item.sgstRate || 0) / 100);
            }
        });
        let calculatedAmount = itemsSubtotal + itemsTotalTax;
        // Assume 'applyRoundOff' state is not directly available here, so we'd rely on form to pass final.
        // For now, we'll use the calculated amount, but if InvoiceForm's data included a finalTotal, that would be better.
        // Let's assume the form data itself would contain the correct amount if rounding was applied.
        // For now, we'll just use the precise calculation. If InvoiceForm applies rounding, it should send rounded amount.
        newInvoice.amount = calculatedAmount; // This should be the potentially rounded amount if logic is passed from form


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

  const defaultNewInvoiceValues: Partial<InvoiceFormValues> = {
    invoiceDate: new Date(),
    dueDate: null, // Default to no due date
    items: [{
      productId: "",
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
    invoiceNumber: "", 
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
