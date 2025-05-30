
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

export function InvoicePrint({ invoice, company, printType: initialPrintType = 'Original' }: InvoicePrintProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  
  const [isOriginal, setIsOriginal] = useState(initialPrintType === 'Original');
  const [isDuplicate, setIsDuplicate] = useState(initialPrintType === 'Duplicate');
  const [isTransportBill, setIsTransportBill] = useState(initialPrintType === 'Triplicate'); // Assuming Triplicate is for Transport
  
  const [invoiceType, setInvoiceType] = useState<'tax' | 'proforma' | 'quotation'>('tax');

  const getCurrentDocumentType = () => {
    if (isTransportBill) return "Transport Bill";
    if (isOriginal) return "Original for Recipient";
    if (isDuplicate) return "Duplicate for Transporter"; // Or "Duplicate for Supplier"
    return "Original for Recipient"; 
  };

  const getCurrentInvoiceTypeTitle = () => {
    switch (invoiceType) {
      case 'proforma': return "PROFORMA INVOICE";
      case 'quotation': return "QUOTATION";
      case 'tax':
      default: return "TAX INVOICE";
    }
  };

  const handleDocumentTypeChange = (type: 'original' | 'duplicate' | 'transport') => {
    setIsOriginal(type === 'original');
    setIsDuplicate(type === 'duplicate');
    setIsTransportBill(type === 'transport');
  };

  useEffect(() => {
    if (showPreview) {
      generatePDF();
    }
  }, [isOriginal, isDuplicate, isTransportBill, invoiceType, showPreview, invoice, company]); // Added invoice & company to re-generate if they change

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
    
    let ro = 0;
    let ft = grandTotal;
    
    if (invoice.roundOffApplied) {
      ft = Math.round(grandTotal);
      ro = ft - grandTotal;
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
      roundOff: ro,
      finalTotal: ft
    };
  }, [invoice.items, invoice.roundOffApplied]);

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
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convertLessThanOneThousand(n % 100) : '');
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
      result += (result ? ' and ' : '') + convertLessThanOneThousand(decimalPart) + ' Paise';
    }
    
    return result.trim() + ' Only';
  };

  const generateInvoiceHTML = () => {
    const itemRowsHtml = invoice.items && invoice.items.length > 0 ? (
      invoice.items.map((item, index) => {
        const itemAmount = (item.quantity || 0) * (item.price || 0);
        const cgstVal = item.applyCgst ? itemAmount * ((item.cgstRate || 0) / 100) : 0;
        const sgstVal = item.applySgst ? itemAmount * ((item.sgstRate || 0) / 100) : 0;
        const igstVal = item.applyIgst ? itemAmount * ((item.igstRate || 0) / 100) : 0;
        const totalItemAmount = itemAmount + cgstVal + sgstVal + igstVal;
        
        return `
          <tr>
            <td class="text-center">${index + 1}</td>
            <td>${item.productName || item.description || item.productId || ''}</td>
            <td class="text-center">${item.gstCategory || ''}</td>
            <td class="text-center">${item.quantity}</td>
            <td class="text-right">${(item.price || 0).toFixed(2)}</td>
            <td class="text-center">${item.applyCgst ? (item.cgstRate || 0).toFixed(1) : '-'}</td>
            <td class="text-center">${item.applySgst ? (item.sgstRate || 0).toFixed(1) : '-'}</td>
            <td class="text-center">${item.applyIgst ? (item.igstRate || 0).toFixed(1) : '-'}</td>
            <td class="text-right">${totalItemAmount.toFixed(2)}</td>
          </tr>
        `;
      }).join('')
    ) : `<tr><td colspan="9" class="text-center" style="height: 150px; vertical-align: middle;">No items</td></tr>`; // Make no items row taller

    const targetItemRows = 12; // Adjusted for A4
    const actualItemCount = invoice.items?.length || 0;
    const emptyRowCount = Math.max(0, targetItemRows - actualItemCount);

    let emptyRowsHtml = '';
    if (actualItemCount > 0 && actualItemCount < targetItemRows) { 
        for (let i = 0; i < emptyRowCount; i++) {
            emptyRowsHtml += `<tr class="empty-row">
                                <td>&nbsp;</td> <td>&nbsp;</td> <td>&nbsp;</td> <td>&nbsp;</td>
                                <td>&nbsp;</td> <td>&nbsp;</td> <td>&nbsp;</td> <td>&nbsp;</td>
                                <td>&nbsp;</td>
                              </tr>`;
        }
    }
    
    const termsAndConditionsHtml = invoice.termsAndConditions ? `
      <div class="terms-box">
        <div class="box-title">Terms & Conditions</div>
        <div class="box-content">${invoice.termsAndConditions.replace(/\n/g, '<br />')}</div>
      </div>
    ` : '';


    return `
    <html>
      <head>
        <title>Invoice - ${invoice.invoiceNumber}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; color: #333; font-size: 9pt; line-height: 1.4; }
          .invoice-box { width: 100%; margin: auto; padding: 0; } /* Changed padding to 0 */
          .title { text-align: center; font-weight: bold; font-size: 16pt; margin-bottom: 2mm; text-transform: uppercase; color: #000; }
          .subtitle { text-align: center; font-size: 10pt; margin-bottom: 2mm; font-weight: bold; color: #000; }
          .company-address, .company-contact { text-align: center; font-size: 8pt; margin-bottom: 1mm; color: #000; }
          .company-contact { margin-bottom: 5mm; }
          .info-container { display: flex; width: 100%; margin-bottom: 3mm; }
          .info-box { border: 1px solid #000; flex: 1; margin: 0 0.5mm; display: flex; flex-direction: column; }
          .info-box-title { font-weight: bold; padding: 1.5mm; border-bottom: 1px solid #000; background-color: #f0f0f0; text-align: center; font-size: 8pt;}
          .info-content { padding: 2mm; font-size: 8pt; flex-grow: 1; }
          .info-row { margin-bottom: 1mm; }
          .info-row strong { display: inline-block; min-width: 80px; } /* Ensure labels align */
          table { width: 100%; border-collapse: collapse; margin-bottom: 3mm; table-layout: fixed; }
          th, td { border: 1px solid #000; padding: 1.5mm; vertical-align: top; font-size: 8pt; word-wrap: break-word; }
          th { background-color: #f0f0f0; text-align: center; font-weight: bold;}
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .amount-word { margin: 3mm 0; font-size: 8pt; }
          .summary-box-container { display: flex; width: 100%; margin-bottom: 3mm; }
          .bank-details, .notes-box, .summary-totals { border: 1px solid #000; display: flex; flex-direction: column; font-size: 8pt;}
          .bank-details { flex: 1.2; margin-right: 1mm;}
          .notes-box { flex: 1.2; margin-right: 1mm;}
          .summary-totals { flex: 1; }
          .box-title { font-weight: bold; padding: 1.5mm; border-bottom: 1px solid #000; background-color: #f0f0f0; text-align: center;}
          .box-content { padding: 2mm; flex-grow: 1; }
          .box-content .info-row { margin-bottom: 1.5mm; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 1mm; }
          .summary-label { font-weight: normal; }
          .summary-value { font-weight: bold; }
          .grand-total .summary-label, .grand-total .summary-value { font-weight: bold; font-size: 9pt; }
          .terms-box { margin-top: 3mm; border: 1px solid #000; font-size: 8pt; }
          .terms-box .box-content { white-space: pre-wrap; }
          .signatures { display: flex; justify-content: space-between; margin-top: 8mm; padding-top: 5mm; border-top: 1px dashed #ccc;}
          .signature-box { width: 48%; text-align: center; font-size: 8pt; }
          .signature-line { margin-top: 15mm; border-top: 1px solid #000; padding-top: 1mm; }
          .original-mark { text-align: right; margin-bottom: 2mm; font-weight: bold; font-size: 9pt; }
          .empty-row td { height: 8mm; border-left: 1px solid #000; border-right: 1px solid #000; border-top: 1px dotted #eee; border-bottom: 1px dotted #eee; }
          .empty-row td:first-child { border-left: 1px solid #000; }
          .empty-row td:last-child { border-right: 1px solid #000; }
          .item-table-footer td { font-weight: bold; }
          @media print {
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .title, .subtitle, .company-address, .company-contact, .info-box-title, th, .box-title { color: #000 !important; }
            .info-box, .bank-details, .notes-box, .summary-totals, .terms-box, table, th, td { border-color: #000 !important; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="original-mark">${getCurrentDocumentType()}</div>
          <div class="title">${getCurrentInvoiceTypeTitle()}</div>
          <div class="subtitle">${company?.name || 'Your Company Name'}</div>
          <div class="company-address">${company?.address || 'Your Company Address'}</div>
          <div class="company-contact">
            Phone: ${company?.phone || 'N/A'} ${company?.phone2 ? ` / ${company.phone2}` : ''} | 
            Email: ${company?.email || 'N/A'} | 
            GSTIN: ${company?.gstin || 'N/A'}
          </div>
          
          <div class="info-container">
            <div class="info-box">
              <div class="info-box-title">Invoice Information</div>
              <div class="info-content">
                <div class="info-row"><strong>Invoice No:</strong> ${invoice.invoiceNumber}</div>
                <div class="info-row"><strong>Date:</strong> ${format(new Date(invoice.invoiceDate), "dd/MM/yyyy")}</div>
                ${invoice.dueDate ? `<div class="info-row"><strong>Due Date:</strong> ${format(new Date(invoice.dueDate), "dd/MM/yyyy")}</div>` : ''}
                <div class="info-row"><strong>Reverse Charge:</strong> No</div>
              </div>
            </div>
            <div class="info-box">
              <div class="info-box-title">Transport Information</div>
              <div class="info-content">
                <div class="info-row"><strong>Mode:</strong> ${invoice.shipmentDetails?.transportationMode || '-'}</div>
                <div class="info-row"><strong>LR No:</strong> ${invoice.shipmentDetails?.lrNo || '-'}</div>
                <div class="info-row"><strong>Vehicle No:</strong> ${invoice.shipmentDetails?.vehicleNo || '-'}</div>
                <div class="info-row"><strong>Date of Supply:</strong> ${invoice.shipmentDetails?.dateOfSupply ? format(new Date(invoice.shipmentDetails.dateOfSupply), "dd/MM/yyyy") : format(new Date(invoice.invoiceDate), "dd/MM/yyyy")}</div>
                <div class="info-row"><strong>Place of Supply:</strong> ${invoice.shipmentDetails?.placeOfSupply || invoice.customerState || '-'}</div>
              </div>
            </div>
          </div>
          
          <div class="info-container">
            <div class="info-box">
              <div class="info-box-title">Details of Receiver (Billed to)</div>
              <div class="info-content">
                <div class="info-row"><strong>Name:</strong> ${invoice.customerName}</div>
                <div class="info-row"><strong>Address:</strong> ${invoice.customerAddress || ''}</div>
                <div class="info-row"><strong>GSTIN:</strong> ${invoice.customerGstin || ''}</div>
                <div class="info-row"><strong>Mobile:</strong> ${invoice.customerPhone || ''}</div>
                <div class="info-row"><strong>State/Code:</strong> ${invoice.customerState && invoice.customerStateCode ? `${invoice.customerState} / ${invoice.customerStateCode}` : (invoice.customerState || '')}</div>
              </div>
            </div>
            <div class="info-box">
              <div class="info-box-title">Details of Consignee (Shipped To)</div>
              <div class="info-content">
                <div class="info-row"><strong>Name:</strong> ${invoice.shipmentDetails?.consigneeName || invoice.customerName || 'SELF'}</div>
                <div class="info-row"><strong>Address:</strong> ${invoice.shipmentDetails?.consigneeAddress || invoice.customerAddress || ''}</div>
                <div class="info-row"><strong>GSTIN:</strong> ${invoice.shipmentDetails?.consigneeGstin || invoice.customerGstin || ''}</div>
                <div class="info-row"><strong>State/Code:</strong> ${invoice.shipmentDetails?.consigneeStateCode || (invoice.customerState && invoice.customerStateCode ? `${invoice.customerState} / ${invoice.customerStateCode}` : (invoice.customerState || ''))}</div>
              </div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 4%;">Sr.</th>
                <th style="width: 30%;">Product Name</th>
                <th style="width: 8%;">HSN/SAC</th>
                <th style="width: 7%;">Qty</th>
                <th style="width: 10%;">Rate (₹)</th>
                <th style="width: 8%;">CGST (%)</th>
                <th style="width: 8%;">SGST (%)</th>
                <th style="width: 8%;">IGST (%)</th>
                <th style="width: 12%;">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${itemRowsHtml}
              ${emptyRowsHtml}
              <tr class="item-table-footer">
                <td colspan="3" class="text-right">Total</td>
                <td class="text-center">${totalQuantity}</td>
                <td class="text-right">${totalRate.toFixed(2)}</td>
                <td class="text-center">${cgstAmount > 0 ? '' : '-'}</td>
                <td class="text-center">${sgstAmount > 0 ? '' : '-'}</td>
                <td class="text-center">${igstAmount > 0 ? '' : '-'}</td>
                <td class="text-right">${subtotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="amount-word">
            <strong>Amount (in words):</strong> ${numberToWords(finalTotal)}
          </div>
          
          <div class="summary-box-container">
            <div class="bank-details">
              <div class="box-title">Bank Details</div>
              <div class="box-content">
                <div class="info-row"><strong>A/c Name:</strong> ${company?.bank_account_name || company?.name || 'N/A'}</div>
                <div class="info-row"><strong>A/c No:</strong> ${company?.bank_account || 'N/A'}</div>
                <div class="info-row"><strong>Bank:</strong> ${company?.bank_name || 'N/A'}</div>
                <div class="info-row"><strong>IFSC:</strong> ${company?.bank_ifsc || 'N/A'}</div>
              </div>
            </div>
            
            <div class="notes-box">
              <div class="box-title">Notes</div>
              <div class="box-content">${invoice.notes ? invoice.notes.replace(/\n/g, '<br />') : ''}</div>
            </div>
            
            <div class="summary-totals">
              <div class="box-title">Summary</div>
              <div class="box-content">
                <div class="summary-row"><span class="summary-label">Sub Total:</span> <span class="summary-value">₹${subtotal.toFixed(2)}</span></div>
                ${cgstAmount > 0 ? `<div class="summary-row"><span class="summary-label">CGST:</span> <span class="summary-value">₹${cgstAmount.toFixed(2)}</span></div>` : ''}
                ${sgstAmount > 0 ? `<div class="summary-row"><span class="summary-label">SGST:</span> <span class="summary-value">₹${sgstAmount.toFixed(2)}</span></div>` : ''}
                ${igstAmount > 0 ? `<div class="summary-row"><span class="summary-label">IGST:</span> <span class="summary-value">₹${igstAmount.toFixed(2)}</span></div>` : ''}
                ${ invoice.roundOffApplied && roundOff !== 0 ? `<div class="summary-row"><span class="summary-label">Round Off:</span> <span class="summary-value">${roundOff >= 0 ? '+' : ''}₹${roundOff.toFixed(2)}</span></div>` : ''}
                <div class="summary-row grand-total" style="border-top: 1px solid #000; padding-top: 1mm; margin-top:1mm;"><span class="summary-label">Grand Total:</span> <span class="summary-value">₹${finalTotal.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
          ${termsAndConditionsHtml}
          <div class="signatures">
            <div class="signature-box">
              <div class="signature-line">Customer's Signature</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">For ${company?.name || 'Your Company Name'}<br/>(Authorized Signatory)</div>
            </div>
          </div>
        </div>
      </body>
    </html>
    `;
  };

  const generatePDF = () => {
    if (!printRef.current && !invoice) return; // Check if invoice is also available
    
    const htmlContent = generateInvoiceHTML();
    const blob = new Blob([htmlContent], { type: 'text/html' });
    
    setPdfBlob(blob);
    
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
    
    return url;
  };

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handlePreview = () => {
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

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.focus(); // Ensure window has focus before print
          printWindow.print();
          // Some browsers might close the window too soon, delay closing.
          // printWindow.onafterprint = () => printWindow.close();
        };
      }
    } else {
      const url = generatePDF();
      if (url) {
        const printWindow = window.open(url);
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
            // printWindow.onafterprint = () => printWindow.close();
          };
        }
      }
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button onClick={handlePreview} className="no-print bg-blue-500 hover:bg-blue-600 text-white">
            <Eye className="mr-2 h-4 w-4" /> Preview / Refresh
          </Button>
          <Button onClick={handlePrint} className="no-print">
            <Printer className="mr-2 h-4 w-4" /> Print: {getCurrentDocumentType()}
          </Button>
        </div>
        
        <div className="flex flex-col space-y-3 p-3 border rounded-md no-print">
          <div className="text-sm font-medium mb-1">Copy Type:</div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="original" 
                checked={isOriginal} 
                onCheckedChange={() => handleDocumentTypeChange('original')}
              />
              <Label htmlFor="original">Original for Recipient</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="duplicate" 
                checked={isDuplicate} 
                onCheckedChange={() => handleDocumentTypeChange('duplicate')}
              />
              <Label htmlFor="duplicate">Duplicate for Transporter</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="transport" 
                checked={isTransportBill} 
                onCheckedChange={() => handleDocumentTypeChange('transport')}
              />
              <Label htmlFor="transport">Triplicate for Supplier</Label> {/* Changed to Triplicate */}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col space-y-3 p-3 border rounded-md no-print">
          <div className="text-sm font-medium mb-1">Document Title:</div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
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
        <div className="border border-gray-300 rounded-md overflow-hidden w-full h-[800px] mb-4 bg-gray-100 shadow-md no-print">
          <iframe 
            src={pdfUrl} 
            className="w-full h-full" 
            title="Invoice Preview" 
            style={{
              border: 'none',
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
              height: `calc(100% / ${zoomLevel})`, // Adjust height based on zoom
              width: `calc(100% / ${zoomLevel})`   // Adjust width based on zoom
            }}
          ></iframe>
        </div>
      )}
      
      {/* The actual printable content, hidden by default from screen view but used for PDF generation */}
      <div ref={printRef} className="hidden print-this-area">
        {/* Content generated by generateInvoiceHTML will be conceptually here for measurement, 
            but directly injected into the iframe's blob for rendering. 
            This div can be minimal or empty. */}
      </div>
    </div>
  );
}
