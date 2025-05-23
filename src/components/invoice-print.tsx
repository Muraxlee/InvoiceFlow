'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { StoredInvoice } from '@/lib/database';
import { formatDateFns } from 'date-fns';

interface InvoicePrintProps {
  invoice: StoredInvoice;
  company: any;
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
    printDocument.write(`
      <html>
        <head>
          <title>Print Invoice - ${invoice.invoiceNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #000;
            }
            .invoice-container {
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              border: 1px solid #ddd;
            }
            .invoice-header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .invoice-header h1 {
              margin: 5px 0;
              font-size: 24px;
              text-transform: uppercase;
            }
            .invoice-header h2 {
              margin: 5px 0;
              font-size: 18px;
            }
            .invoice-header p {
              margin: 5px 0;
              font-size: 14px;
            }
            .invoice-sections {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
            }
            .invoice-section {
              width: 48%;
              border: 1px solid #ddd;
              padding: 10px;
            }
            .invoice-section h3 {
              margin-top: 0;
              margin-bottom: 10px;
              font-size: 16px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            .invoice-section p {
              margin: 5px 0;
              font-size: 14px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f8f8f8;
            }
            .total-row {
              font-weight: bold;
            }
            .amount-in-words {
              margin-bottom: 20px;
              font-style: italic;
            }
            .footer-sections {
              display: flex;
              justify-content: space-between;
              margin-top: 30px;
            }
            .bank-details, .notes, .summary {
              width: 30%;
              border: 1px solid #ddd;
              padding: 10px;
            }
            .signature {
              display: flex;
              justify-content: space-between;
              margin-top: 50px;
            }
            .signature div {
              width: 40%;
              text-align: center;
              border-top: 1px solid #000;
              padding-top: 10px;
            }
            @media print {
              .no-print {
                display: none;
              }
              body {
                margin: 0;
                padding: 0;
              }
              .invoice-container {
                border: none;
              }
            }
          </style>
        </head>
        <body>
          ${content.innerHTML}
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printDocument.close();
  };

  // Calculate subtotal, tax, total
  const subtotal = invoice.items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.price || 0),
    0
  );
  const cgst = subtotal * 0.09;
  const sgst = subtotal * 0.09;
  const total = subtotal + cgst + sgst;

  // Convert number to words function
  function numberToWords(num: number) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    
    const convertLessThanOneThousand = (num: number) => {
      if (num < 20) return ones[num];
      const digit = num % 10;
      if (num < 100) return tens[Math.floor(num / 10)] + (digit ? ' ' + ones[digit] : '');
      return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + convertLessThanOneThousand(num % 100) : '');
    };
    
    let result = '';
    let num_parts = [];
    
    // Break the number into billions, millions, thousands, etc.
    while (num > 0) {
      num_parts.push(num % 1000);
      num = Math.floor(num / 1000);
    }
    
    if (num_parts.length > 0 && num_parts[0] > 0)
      result = convertLessThanOneThousand(num_parts[0]);
    
    if (num_parts.length > 1 && num_parts[1] > 0)
      result = convertLessThanOneThousand(num_parts[1]) + ' Thousand ' + result;
    
    if (num_parts.length > 2 && num_parts[2] > 0)
      result = convertLessThanOneThousand(num_parts[2]) + ' Lakh ' + result;
    
    if (num_parts.length > 3 && num_parts[3] > 0)
      result = convertLessThanOneThousand(num_parts[3]) + ' Crore ' + result;
    
    return result.trim();
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return amount.toFixed(2);
  };

  // Get the cents/paise part for words
  const getPaiseInWords = (amount: number) => {
    const paise = Math.round((amount - Math.floor(amount)) * 100);
    return paise > 0 ? ` and ${numberToWords(paise)} Paise` : '';
  };

  return (
    <>
      <Button onClick={handlePrint} className="mb-4">
        <Printer className="mr-2 h-4 w-4" /> Print {printType}
      </Button>
      
      <div ref={printRef} className="invoice-container">
        <div className="invoice-header">
          <h1>TAX INVOICE</h1>
          <h2>{company?.name || "Seafarer's Naval Tailors"}</h2>
          <p>{company?.address || "NEW NO 19, OLD NO 9, LINGI-II CHETTY ST, MANNAD, CHENNAI- 600001"}</p>
          <p>{company?.phone || "+91 9841147133"}, {company?.email || "smabdulrab@gmail.com"}</p>
        </div>
        
        <div className="invoice-sections">
          <div className="invoice-section">
            <h3>Invoice Information</h3>
            <p><strong>Invoice No:</strong> {invoice.invoiceNumber}</p>
            <p><strong>Invoice Date:</strong> {invoice.invoiceDate.toLocaleDateString()}</p>
            <p><strong>GSTIN:</strong> {company?.gstin || "33AHDPA2286J1ZM"}</p>
            <p><strong>Reverse Charge:</strong> No</p>
          </div>
          
          <div className="invoice-section">
            <h3>Transport Information</h3>
            <p><strong>Transportation Mode:</strong> -</p>
            <p><strong>LR No:</strong> -</p>
            <p><strong>Vehicle No:</strong> -</p>
            <p><strong>Date of Supply:</strong> {invoice.invoiceDate.toLocaleDateString()}</p>
            <p><strong>Place of Supply:</strong> -</p>
          </div>
        </div>
        
        <div className="invoice-sections">
          <div className="invoice-section">
            <h3>Details of Receiver (Billed to)</h3>
            <p><strong>Name:</strong> {invoice.customerName}</p>
            <p><strong>Address:</strong> {invoice.customerAddress || '-'}</p>
            <p><strong>GSTIN:</strong> {'-'}</p>
            <p><strong>Mobile No:</strong> {'-'}</p>
            <p><strong>State / Code:</strong> {'-'}</p>
          </div>
          
          <div className="invoice-section">
            <h3>Details of Consignee (Shipped To)</h3>
            <p><strong>Name:</strong> {invoice.customerName}</p>
            <p><strong>Address:</strong> {invoice.customerAddress || '-'}</p>
            <p><strong>GSTIN:</strong> {'-'}</p>
            <p><strong>State / Code:</strong> {'-'}</p>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Sr.</th>
              <th>Description</th>
              <th>HSN/SAC</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
              <th>CGST %</th>
              <th>SGST %</th>
              <th>IGST %</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => {
              const itemTotal = (item.quantity || 0) * (item.price || 0);
              return (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{item.description}</td>
                  <td>{item.gstCategory || '-'}</td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.price || 0)}</td>
                  <td>{formatCurrency(itemTotal)}</td>
                  <td>9.00</td>
                  <td>9.00</td>
                  <td>-</td>
                  <td>{formatCurrency(itemTotal * 1.18)}</td>
                </tr>
              );
            })}
            <tr className="total-row">
              <td colSpan={5}>Total</td>
              <td>{formatCurrency(subtotal)}</td>
              <td colSpan={2}>{formatCurrency(cgst + sgst)}</td>
              <td>-</td>
              <td>{formatCurrency(total)}</td>
            </tr>
          </tbody>
        </table>
        
        <div className="amount-in-words">
          <strong>Amount in Words:</strong> {numberToWords(Math.floor(total))}{getPaiseInWords(total)} Only
        </div>
        
        <div className="footer-sections">
          <div className="bank-details">
            <h3>Bank Details</h3>
            <p><strong>Account Name:</strong> {company?.name || "Seafarer Naval Tailor"}</p>
            <p><strong>Bank A/C No:</strong> {company?.bank_account || "01662560007135"}</p>
            <p><strong>Bank Name:</strong> {company?.bank_name || "HDFC BANK"}</p>
            <p><strong>Bank IFSC:</strong> {company?.bank_ifsc || "HDFC0001166"}</p>
          </div>
          
          <div className="notes">
            <h3>Notes</h3>
            <p>{invoice.notes || "Test invoice created automatically"}</p>
          </div>
          
          <div className="summary">
            <h3>Summary</h3>
            <p><strong>Sub Total:</strong> {formatCurrency(subtotal)}</p>
            <p><strong>Total Tax:</strong> {formatCurrency(cgst + sgst)}</p>
            <p><strong>Round Off:</strong> 0.00</p>
            <p><strong>Grand Total:</strong> {formatCurrency(total)}</p>
          </div>
        </div>
        
        <div className="signature">
          <div>
            <p>Customer's Signature</p>
          </div>
          <div>
            <p>For {company?.name || "Seafarer's Naval Tailors"}</p>
            <p>Authorized Signatory</p>
          </div>
        </div>
      </div>
    </>
  );
} 