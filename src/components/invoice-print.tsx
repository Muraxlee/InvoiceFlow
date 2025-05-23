
'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { StoredInvoice } from '@/lib/database'; // Updated type
import { formatDateFns } from 'date-fns';

interface InvoicePrintProps {
  invoice: StoredInvoice;
  company: any; // Consider defining a Company type
  printType?: 'Original' | 'Duplicate' | 'Triplicate';
}

export function InvoicePrint({ invoice, company, printType = 'Original' }: InvoicePrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printDocument = printWindow.document;
    // Added more comprehensive styling for better print output
    printDocument.write(`
      <html>
        <head>
          <title>Print Invoice - ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: 'Arial', sans-serif; margin: 20px; color: #333; font-size: 10pt; }
            .invoice-box { max-width: 800px; margin: auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); }
            .header, .company-details, .customer-details, .invoice-details, .shipment-info { margin-bottom: 20px; }
            .header h1 { text-align: center; color: #333; margin-bottom: 5px; font-size: 1.8em; text-transform: uppercase;}
            .header h2 { text-align: center; color: #555; margin-bottom: 2px; font-size: 1.2em;}
            .header p { text-align: center; color: #777; margin: 0; font-size: 0.9em; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom:20px; }
            .details-section { padding:10px; border: 1px solid #f0f0f0; border-radius: 4px; }
            .details-section h3 { margin-top: 0; font-size: 1em; color: #444; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; }
            .details-section p { margin: 4px 0; font-size: 0.9em; }
            .details-section p strong { color: #555; }
            table { width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; }
            table td, table th { padding: 8px; border: 1px solid #ddd; vertical-align: top; }
            table th { background-color: #f8f8f8; font-weight: bold; text-align:center; }
            table .description { width: 40%; }
            table .number { text-align: right; }
            .totals { margin-top: 20px; text-align: right; }
            .totals table { width: auto; margin-left: auto; border: none; }
            .totals table td, .totals table th { border: none; padding: 5px 8px; }
            .totals table tr.heading td { background: #eee; border-bottom: 1px solid #ddd; font-weight: bold; }
            .totals table tr.total td { border-top: 2px solid #eee; font-weight: bold; font-size: 1.1em; }
            .notes-terms { margin-top: 30px; font-size: 0.85em; }
            .notes-terms h4 { margin-bottom: 5px; }
            .footer { text-align: center; font-size: 0.8em; color: #777; margin-top: 30px; padding-top:10px; border-top: 1px solid #eee; }
            .print-type { text-align: right; font-style: italic; margin-bottom: 10px; font-size: 0.9em; }
            @media print {
              .no-print { display: none; }
              body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .invoice-box { box-shadow: none; border: none; margin: 0; max-width: 100%; padding: 10px 0; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            ${content.innerHTML}
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printDocument.close();
  };

  const { subtotal, igstAmount, cgstAmount, sgstAmount, totalTax, total } = useMemo(() => {
    const currentItems = invoice.items || [];
    const sub = currentItems.reduce((acc, item) => acc + (item.quantity || 0) * (item.price || 0), 0);
    let cgst = 0; let sgst = 0; let igst = 0;
    currentItems.forEach(item => {
      const itemAmount = (item.quantity || 0) * (item.price || 0);
      if (item.applyIgst) igst += itemAmount * ((item.igstRate || 0) / 100);
      if (item.applyCgst) cgst += itemAmount * ((item.cgstRate || 0) / 100);
      if (item.applySgst) sgst += itemAmount * ((item.sgstRate || 0) / 100);
    });
    const tax = cgst + sgst + igst;
    const grandTotal = sub + tax;
    return { subtotal: sub, igstAmount: igst, cgstAmount: cgst, sgstAmount: sgst, totalTax: tax, total: grandTotal };
  }, [invoice.items]);

  return (
    <>
      <Button onClick={handlePrint} className="mb-4 no-print">
        <Printer className="mr-2 h-4 w-4" /> Print {printType}
      </Button>
      
      <div ref={printRef} className="print-content">
        <div className="print-type">{printType} Copy</div>
        <div className="header">
          <h1>TAX INVOICE</h1>
          <h2>{company?.name || "Your Company Name"}</h2>
          <p>{company?.address || "Your Company Address"}</p>
          <p>Phone: {company?.phone || "N/A"} | Email: {company?.email || "N/A"}</p>
          {company?.gstin && <p>GSTIN: {company.gstin}</p>}
        </div>

        <div className="details-grid">
          <div className="details-section invoice-details">
            <h3>Invoice Details</h3>
            <p><strong>Invoice No:</strong> {invoice.invoiceNumber}</p>
            <p><strong>Invoice Date:</strong> {formatDateFns(new Date(invoice.invoiceDate), "dd-MMM-yyyy")}</p>
            <p><strong>Due Date:</strong> {formatDateFns(new Date(invoice.dueDate), "dd-MMM-yyyy")}</p>
            <p><strong>Status:</strong> {invoice.paymentStatus}</p>
            {invoice.paymentMethod && <p><strong>Payment Method:</strong> {invoice.paymentMethod}</p>}
          </div>

          <div className="details-section customer-details">
            <h3>Billed To</h3>
            <p><strong>{invoice.customerName}</strong></p>
            {invoice.customerAddress && <p>{invoice.customerAddress}</p>}
            {invoice.customerEmail && <p>Email: {invoice.customerEmail}</p>}
            {/* Add customer GSTIN here if available from customer object */}
          </div>
        </div>
        
        {(invoice.shipmentDetails?.consigneeName || invoice.shipmentDetails?.transportationMode) && (
          <div className="details-grid shipment-info">
            <div className="details-section">
              <h3>Shipped To (Consignee)</h3>
              <p><strong>Name:</strong> {invoice.shipmentDetails?.consigneeName || invoice.customerName}</p>
              <p><strong>Address:</strong> {invoice.shipmentDetails?.consigneeAddress || invoice.customerAddress || 'N/A'}</p>
              {invoice.shipmentDetails?.consigneeGstin && <p><strong>GSTIN:</strong> {invoice.shipmentDetails.consigneeGstin}</p>}
              {invoice.shipmentDetails?.consigneeStateCode && <p><strong>State/Code:</strong> {invoice.shipmentDetails.consigneeStateCode}</p>}
            </div>
            <div className="details-section">
              <h3>Transport Information</h3>
              <p><strong>Mode:</strong> {invoice.shipmentDetails?.transportationMode || 'N/A'}</p>
              <p><strong>Date of Supply:</strong> {invoice.shipmentDetails?.dateOfSupply ? formatDateFns(new Date(invoice.shipmentDetails.dateOfSupply), "dd-MMM-yyyy") : 'N/A'}</p>
              <p><strong>LR No.:</strong> {invoice.shipmentDetails?.lrNo || 'N/A'}</p>
              <p><strong>Vehicle No.:</strong> {invoice.shipmentDetails?.vehicleNo || 'N/A'}</p>
              <p><strong>Place of Supply:</strong> {invoice.shipmentDetails?.placeOfSupply || 'N/A'}</p>
              {invoice.shipmentDetails?.carrierName && <p><strong>Carrier:</strong> {invoice.shipmentDetails.carrierName}</p>}
              {invoice.shipmentDetails?.trackingNumber && <p><strong>Tracking #:</strong> {invoice.shipmentDetails.trackingNumber}</p>}
              {invoice.shipmentDetails?.shipDate && <p><strong>Ship Date:</strong> {formatDateFns(new Date(invoice.shipmentDetails.shipDate), "dd-MMM-yyyy")}</p>}
            </div>
          </div>
        )}

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th className="description">Item & Description</th>
              <th>HSN/SAC</th>
              <th>Qty</th>
              <th className="number">Rate (₹)</th>
              <th className="number">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>
                  <strong>{products.find(p => p.id === item.productId)?.name || 'N/A'}</strong><br />
                  <small>{item.description}</small>
                </td>
                <td>{item.gstCategory || '-'}</td>
                <td className="number">{item.quantity}</td>
                <td className="number">{(item.price || 0).toFixed(2)}</td>
                <td className="number">{((item.quantity || 0) * (item.price || 0)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals">
          <table>
            <tr><td>Subtotal:</td><td className="number">₹{subtotal.toFixed(2)}</td></tr>
            {igstAmount > 0 && <tr><td>IGST Total:</td><td className="number">₹{igstAmount.toFixed(2)}</td></tr>}
            {cgstAmount > 0 && <tr><td>CGST Total:</td><td className="number">₹{cgstAmount.toFixed(2)}</td></tr>}
            {sgstAmount > 0 && <tr><td>SGST Total:</td><td className="number">₹{sgstAmount.toFixed(2)}</td></tr>}
            <tr className="total"><td>Grand Total:</td><td className="number">₹{total.toFixed(2)}</td></tr>
          </table>
        </div>

        {company?.bank_name && (
          <div className="notes-terms">
            <h4>Bank Details:</h4>
            <p>Bank: {company.bank_name} | A/C: {company.bank_account} | IFSC: {company.bank_ifsc}</p>
          </div>
        )}

        <div className="notes-terms">
          {invoice.notes && <><h4>Notes:</h4><p>{invoice.notes}</p></>}
          {invoice.termsAndConditions && <><h4>Terms & Conditions:</h4><p>{invoice.termsAndConditions}</p></>}
        </div>

        <div className="footer">
          <p>This is a computer-generated invoice.</p>
          <p>For {company?.name || "Your Company Name"} | Authorized Signatory</p>
        </div>
      </div>
    </>
  );
}

    