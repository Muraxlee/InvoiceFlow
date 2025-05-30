'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, FileText, Eye } from 'lucide-react';
import { StoredInvoice } from '@/lib/database'; // Updated type
import { format } from 'date-fns';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface InvoicePrintProps {
  invoice: StoredInvoice;
  company: any; // Consider defining a Company type
  printType?: 'Original' | 'Duplicate' | 'Triplicate';
}

export function InvoicePrint({ invoice, company, printType = 'Original' }: InvoicePrintProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  
  // Document type options
  const [isOriginal, setIsOriginal] = useState(true);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isTransportBill, setIsTransportBill] = useState(false);
  
  // Invoice type options
  const [invoiceType, setInvoiceType] = useState<'tax' | 'proforma' | 'quotation'>('tax');

  // Get current document type label
  const getCurrentDocumentType = () => {
    if (isTransportBill) return "Transport Bill";
    if (isOriginal) return "Original";
    if (isDuplicate) return "Duplicate";
    return "Original"; // Default
  };

  // Get current invoice type label
  const getCurrentInvoiceTypeTitle = () => {
    switch (invoiceType) {
      case 'proforma': return "PROFORMA INVOICE";
      case 'quotation': return "QUOTATION";
      case 'tax':
      default: return "TAX INVOICE";
    }
  };

  // Handle document type change
  const handleDocumentTypeChange = (type: 'original' | 'duplicate' | 'transport') => {
    setIsOriginal(type === 'original');
    setIsDuplicate(type === 'duplicate');
    setIsTransportBill(type === 'transport');
  };

  // Effect to regenerate PDF when options change
  useEffect(() => {
    if (showPreview) {
      generatePDF();
    }
  }, [isOriginal, isDuplicate, isTransportBill, invoiceType, showPreview]);

  // Generate the HTML content for the invoice
  const generateInvoiceHTML = () => {
    return `
    <html>
      <head>
        <title>Invoice - ${invoice.invoiceNumber}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; color: #000; font-size: 10pt; }
          .invoice-box { max-width: 800px; margin: auto; padding: 10px 15px; }
          .title { text-align: center; font-weight: bold; font-size: 16pt; margin-bottom: 5px; text-transform: uppercase; }
          .subtitle { text-align: center; font-size: 14pt; margin-bottom: 5px; font-weight: bold; }
          .company-address { text-align: center; margin-bottom: 5px; }
          .company-contact { text-align: center; margin-bottom: 15px; }
          .info-container { display: flex; width: 100%; margin-bottom: 10px; }
          .info-box { border: 1px solid #000; flex: 1; margin: 0 1px; }
          .info-box-title { font-weight: bold; padding: 3px; border-bottom: 1px solid #000; }
          .info-content { padding: 5px; }
          .info-row { margin-bottom: 3px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          table, th, td { border: 1px solid #000; }
          th { background-color: #f5f5f5; padding: 4px; text-align: center; font-weight: bold; font-size: 9pt; }
          td { padding: 3px; vertical-align: top; font-size: 9pt; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .amount-word { margin: 10px 0; }
          .summary-box { width: 100%; display: flex; }
          .bank-details { flex: 1; border: 1px solid #000; margin-right: 5px; }
          .notes-box { flex: 1; border: 1px solid #000; margin-right: 5px; }
          .summary-totals { flex: 1; border: 1px solid #000; }
          .box-title { font-weight: bold; padding: 3px; border-bottom: 1px solid #000; }
          .box-content { padding: 5px; }
          .summary-row { display: flex; margin-bottom: 5px; }
          .summary-label { flex: 1; font-weight: bold; }
          .summary-value { flex: 1.5; text-align: right; }
          .summary-colon { padding: 0 5px; }
          .bold { font-weight: bold; }
          .signatures { display: flex; justify-content: space-between; margin-top: 30px; }
          .signature-box { width: 45%; text-align: center; }
          .signature-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; }
          .original-mark { text-align: right; margin-bottom: 5px; font-weight: bold; }
          .empty-row td { height: 15px; }
          @media print {
            body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          ${printRef.current?.innerHTML || ''}
        </div>
      </body>
    </html>
    `;
  };

  // Function to generate PDF from HTML
  const generatePDF = () => {
    if (!printRef.current) return;
    
    // Create a blob of the HTML content
    const htmlContent = generateInvoiceHTML();
    const blob = new Blob([htmlContent], { type: 'text/html' });
    
    // Save the blob for reuse
    setPdfBlob(blob);
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
    
    return url;
  };

  // Clean up the blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handlePreview = () => {
    // Reuse existing PDF blob if available
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setShowPreview(true);
    } else {
      const url = generatePDF();
      if (url) {
        setShowPreview(true);
      }
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  };

  const handlePrint = () => {
    if (pdfUrl) {
      // Open the PDF in a new window for printing
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } else {
      const url = generatePDF();
      if (url) {
        const printWindow = window.open(url);
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      }
    }
  };

  const { subtotal, igstAmount, cgstAmount, sgstAmount, totalTax, total, totalQuantity, totalRate, roundOff, finalTotal } = useMemo(() => {
    const currentItems = invoice.items || [];
    let totalQty = 0;
    let totalRt = 0;
    const sub = currentItems.reduce((acc, item) => {
      totalQty += (item.quantity || 0);
      totalRt += (item.price || 0);
      return acc + (item.quantity || 0) * (item.price || 0);
    }, 0);
    let cgst = 0; let sgst = 0; let igst = 0;
    currentItems.forEach(item => {
      const itemAmount = (item.quantity || 0) * (item.price || 0);
      if (item.applyIgst) igst += itemAmount * ((item.igstRate || 0) / 100);
      if (item.applyCgst) cgst += itemAmount * ((item.cgstRate || 0) / 100);
      if (item.applySgst) sgst += itemAmount * ((item.sgstRate || 0) / 100);
    });
    const tax = cgst + sgst + igst;
    const grandTotal = sub + tax;
    
    // Calculate round off if it exists in the invoice
    let roundOff = 0;
    let finalTotal = grandTotal;
    
    // Check if the invoice has roundOffApplied property
    if (invoice.roundOffApplied) {
      finalTotal = Math.round(grandTotal);
      roundOff = finalTotal - grandTotal;
    }
    
    return { 
      subtotal: sub, 
      igstAmount: igst, 
      cgstAmount: cgst, 
      sgstAmount: sgst, 
      totalTax: tax, 
      total: grandTotal,
      totalQuantity: totalQty,
      totalRate: totalRt,
      roundOff: roundOff,
      finalTotal: finalTotal
    };
  }, [invoice.items, invoice.roundOffApplied]);

  // Function to convert number to words for Indian currency
  const numberToWords = (num: number) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const numString = num.toFixed(2);
    const parts = numString.split('.');
    const wholePart = parseInt(parts[0]);
    const decimalPart = parseInt(parts[1]);
    
    if (num === 0) return 'Zero Rupees Only';
    
    function convertLessThanOneThousand(n: number) {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanOneThousand(n % 100) : '');
    }
    
    let result = '';
    if (wholePart > 0) {
      const crores = Math.floor(wholePart / 10000000);
      const lakhs = Math.floor((wholePart % 10000000) / 100000);
      const thousands = Math.floor((wholePart % 100000) / 1000);
      const hundreds = wholePart % 1000;
      
      if (crores > 0) result += convertLessThanOneThousand(crores) + ' Crore ';
      if (lakhs > 0) result += convertLessThanOneThousand(lakhs) + ' Lakh ';
      if (thousands > 0) result += convertLessThanOneThousand(thousands) + ' Thousand ';
      if (hundreds > 0) result += convertLessThanOneThousand(hundreds);
      
      result += ' Rupees';
    }
    
    if (decimalPart > 0) {
      result += ' and ' + convertLessThanOneThousand(decimalPart) + ' Paise';
    }
    
    return result + ' Only';
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="space-y-3">
        <div className="flex space-x-2">
          <Button onClick={handlePreview} className="mb-2 no-print bg-blue-500 hover:bg-blue-600 text-white">
            <Eye className="mr-2 h-4 w-4" /> Preview
          </Button>
          <Button onClick={handlePrint} className="mb-2 no-print">
            <Printer className="mr-2 h-4 w-4" /> Print {getCurrentDocumentType()}
          </Button>
        </div>
        
        <div className="flex flex-col space-y-3 p-3 border rounded-md">
          <div className="text-sm font-medium mb-1">Document Type:</div>
          <div className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="original" 
                checked={isOriginal} 
                onCheckedChange={() => handleDocumentTypeChange('original')}
              />
              <Label htmlFor="original">Original</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="duplicate" 
                checked={isDuplicate} 
                onCheckedChange={() => handleDocumentTypeChange('duplicate')}
              />
              <Label htmlFor="duplicate">Duplicate</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="transport" 
                checked={isTransportBill} 
                onCheckedChange={() => handleDocumentTypeChange('transport')}
              />
              <Label htmlFor="transport">Transport Bill</Label>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col space-y-3 p-3 border rounded-md">
          <div className="text-sm font-medium mb-1">Invoice Type:</div>
          <div className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="tax" 
                checked={invoiceType === 'tax'} 
                onCheckedChange={() => setInvoiceType('tax')}
              />
              <Label htmlFor="tax">Tax Invoice</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="proforma" 
                checked={invoiceType === 'proforma'} 
                onCheckedChange={() => setInvoiceType('proforma')}
              />
              <Label htmlFor="proforma">Proforma Invoice</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="quotation" 
                checked={invoiceType === 'quotation'} 
                onCheckedChange={() => setInvoiceType('quotation')}
              />
              <Label htmlFor="quotation">Quotation</Label>
            </div>
          </div>
        </div>
      </div>
      
      {showPreview && pdfUrl && (
        <div className="border border-gray-300 rounded-md overflow-hidden w-full h-[800px] mb-4 bg-white shadow-md">
          <iframe 
            src={pdfUrl} 
            className="w-full h-full" 
            title="Invoice Preview" 
            style={{
              backgroundColor: 'white',
              border: 'none',
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
              height: `${100/zoomLevel}%`,
              width: `${100/zoomLevel}%`
            }}
          ></iframe>
        </div>
      )}
      
      <div ref={printRef} className="print-content hidden">
        <div className="original-mark">{getCurrentDocumentType()}</div>
        
        <div className="title">{getCurrentInvoiceTypeTitle()}</div>
        <div className="subtitle">Seafarer's Naval Tailors</div>
        <div className="company-address">NEW NO 19, OLD NO 9, LINGI-II CHETTY ST, MANNAD, CHENNAI- 600001</div>
        <div className="company-contact">+91 9841147133, +91 99400 56911 | smabdulrab@gmail.com</div>
        
        <div className="info-container">
          <div className="info-box">
            <div className="info-box-title">Invoice Information</div>
            <div className="info-content">
              <div className="info-row"><strong>Invoice No:</strong> {invoice.invoiceNumber}</div>
              <div className="info-row"><strong>Invoice Date:</strong> {format(new Date(invoice.invoiceDate), "dd/MM/yyyy")}</div>
              <div className="info-row"><strong>GSTIN:</strong> {company?.gstin || '33AHDPA2286J1ZM'}</div>
              <div className="info-row"><strong>Reverse Charge:</strong> No</div>
            </div>
          </div>
          
          <div className="info-box">
            <div className="info-box-title">Transport Information</div>
            <div className="info-content">
              <div className="info-row"><strong>Transportation Mode:</strong> {invoice.shipmentDetails?.transportationMode || '-'}</div>
              <div className="info-row"><strong>LR No:</strong> {invoice.shipmentDetails?.lrNo || '-'}</div>
              <div className="info-row"><strong>Vehicle No:</strong> {invoice.shipmentDetails?.vehicleNo || '-'}</div>
              <div className="info-row"><strong>Date of Supply:</strong> {invoice.shipmentDetails?.dateOfSupply ? format(new Date(invoice.shipmentDetails.dateOfSupply), "dd/MM/yyyy") : format(new Date(invoice.invoiceDate), "dd/MM/yyyy")}</div>
              <div className="info-row"><strong>Place of Supply:</strong> {invoice.shipmentDetails?.placeOfSupply || '-'}</div>
            </div>
          </div>
        </div>
        
        <div className="info-container">
          <div className="info-box">
            <div className="info-box-title">Details of Receiver (Billed to)</div>
            <div className="info-content">
              <div className="info-row"><strong>Name:</strong> {invoice.customerName}</div>
              <div className="info-row"><strong>Address:</strong> {invoice.customerAddress || 'ameer chennai'}</div>
              <div className="info-row"><strong>GSTIN:</strong> {invoice.customerGstin || ''}</div>
              <div className="info-row"><strong>Mobile No:</strong> {invoice.customerPhone || '1234567890'}</div>
              <div className="info-row"><strong>State / Code:</strong> {invoice.customerState && invoice.customerStateCode ? `${invoice.customerState} / ${invoice.customerStateCode}` : ''}</div>
            </div>
          </div>
          
          <div className="info-box">
            <div className="info-box-title">Details of Consignee (Shipped To)</div>
            <div className="info-content">
              <div className="info-row"><strong>Name:</strong> {invoice.shipmentDetails?.consigneeName || invoice.customerName || 'SELF'}</div>
              <div className="info-row"><strong>Address:</strong> {invoice.shipmentDetails?.consigneeAddress || invoice.customerAddress || 'ameer chennai'}</div>
              <div className="info-row"><strong>GSTIN:</strong> {invoice.shipmentDetails?.consigneeGstin ? invoice.shipmentDetails.consigneeGstin : ''}</div>
              <div className="info-row"><strong>State / Code:</strong> {invoice.shipmentDetails?.consigneeStateCode ? invoice.shipmentDetails.consigneeStateCode : (invoice.customerState && invoice.customerStateCode ? `${invoice.customerState} / ${invoice.customerStateCode}` : '')}</div>
            </div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style={{width: '5%'}}>Sr.</th>
              <th style={{width: '38%'}}>Product Name</th>
              <th style={{width: '10%'}}>HSN/SAC</th>
              <th style={{width: '8%'}}>Qty</th>
              <th style={{width: '9%'}}>Rate</th>
              <th style={{width: '7%'}}>CGST %</th>
              <th style={{width: '7%'}}>SGST %</th>
              <th style={{width: '6%'}}>IGST %</th>
              <th style={{width: '15%'}}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items && invoice.items.length > 0 ? (
              invoice.items.map((item, index) => {
                const itemAmount = (item.quantity || 0) * (item.price || 0);
                const cgstAmount = item.applyCgst ? itemAmount * ((item.cgstRate || 0) / 100) : 0;
                const sgstAmount = item.applySgst ? itemAmount * ((item.sgstRate || 0) / 100) : 0;
                const igstAmount = item.applyIgst ? itemAmount * ((item.igstRate || 0) / 100) : 0;
                const totalItemAmount = itemAmount + cgstAmount + sgstAmount + igstAmount;
                
                return (
                  <tr key={index}>
                    <td className="text-center">{index + 1}</td>
                    <td>{item.productName || item.description || item.productId || ''}</td>
                    <td className="text-center">{item.gstCategory || ''}</td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">{item.price.toFixed(2)}</td>
                    <td className="text-center">{item.applyCgst ? item.cgstRate : 0}</td>
                    <td className="text-center">{item.applySgst ? item.sgstRate : 0}</td>
                    <td className="text-center">{item.applyIgst ? item.igstRate : 0}</td>
                    <td className="text-right">{totalItemAmount.toFixed(2)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="text-center">No items</td>
              </tr>
            )}

            {/* Add empty rows to match the image format */}
            {Array.from({ length: Math.max(0, 10 - (invoice.items?.length || 0)) }).map((_, index) => (
              <tr key={`empty-${index}`} className="empty-row">
                <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
              </tr>
            ))}
            
            <tr>
              <td colSpan={3} className="text-right"><strong>Total</strong></td>
              <td className="text-center"><strong>{totalQuantity}</strong></td>
              <td className="text-right"><strong>{totalRate.toFixed(2)}</strong></td>
              <td className="text-center">{cgstAmount > 0 ? cgstAmount.toFixed(2) : '0.00'}</td>
              <td className="text-center">{sgstAmount > 0 ? sgstAmount.toFixed(2) : '0.00'}</td>
              <td className="text-center">{igstAmount > 0 ? igstAmount.toFixed(2) : '0.00'}</td>
              <td className="text-right"><strong>{finalTotal.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
        
        <div className="amount-word">
          <strong>Amount in Words:</strong> {numberToWords(finalTotal)}
        </div>
        
        <div className="summary-box">
          <div className="bank-details">
            <div className="box-title">Bank Details</div>
            <div className="box-content">
              <div className="info-row"><strong>Account Name:</strong> {company?.bankAccountName || 'Seafarer Naval Tailor'}</div>
              <div className="info-row"><strong>Bank A/C No:</strong> {company?.bankAccount || '01662560007135'}</div>
              <div className="info-row"><strong>Bank Name:</strong> {company?.bankName || 'HDFC BANK'}</div>
              <div className="info-row"><strong>Bank IFSC:</strong> {company?.bankIfsc || 'HDFC0001156'}</div>
            </div>
          </div>
          
          <div className="notes-box">
            <div className="box-title">Notes</div>
            <div className="box-content">{invoice.notes || 'Test invoice created automatically'}</div>
          </div>
          
          <div className="summary-totals">
            <div className="box-title">Summary</div>
            <div className="box-content">
              <div className="summary-row">
                <div className="summary-label">Sub Total</div>
                <div className="summary-colon">:</div>
                <div className="summary-value">{subtotal.toFixed(2)}</div>
              </div>
              <div className="summary-row">
                <div className="summary-label">Total Tax</div>
                <div className="summary-colon">:</div>
                <div className="summary-value">{totalTax.toFixed(2)}</div>
              </div>
              <div className="summary-row">
                <div className="summary-label">Round Off</div>
                <div className="summary-colon">:</div>
                <div className="summary-value">{roundOff ? roundOff.toFixed(2) : "0.00"}</div>
              </div>
              <div className="summary-row">
                <div className="summary-label">Grand Total</div>
                <div className="summary-colon">:</div>
                <div className="summary-value">{finalTotal.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="signatures">
          <div className="signature-box">
            <div className="signature-line">Customer's Signature</div>
          </div>
          <div className="signature-box">
            <div className="signature-line">For Seafarer's Naval Tailors<br/>Authorized Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
}

    