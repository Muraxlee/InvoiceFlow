
'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, FileText, Eye, Anchor } from 'lucide-react';
import { StoredInvoice, CompanyData } from '@/types/database'; 
import { format } from 'date-fns';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface InvoicePrintProps {
  invoice: StoredInvoice;
  company: CompanyData | null;
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
  const [isTransportBill, setIsTransportBill] = useState(initialPrintType === 'Triplicate'); 
  
  const [invoiceType, setInvoiceType] = useState<'tax' | 'proforma' | 'quotation'>('tax');

  const getCurrentDocumentType = () => {
    if (isTransportBill) return "Triplicate for Supplier";
    if (isOriginal) return "Original for Recipient";
    if (isDuplicate) return "Duplicate for Transporter";
    return "Original for Recipient"; 
  };

  const getCurrentInvoiceTypeTitle = () => {
    switch (invoiceType) {
      case 'proforma': return "PROFORMA INVOICE";
      case 'quotation': return "Quotation";
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
  }, [isOriginal, isDuplicate, isTransportBill, invoiceType, showPreview, invoice, company]);

  const { subtotal, igstAmount, cgstAmount, sgstAmount, totalTax, total, totalQuantity, totalRate, roundOff, finalTotal, additionalChargesTotal } = useMemo(() => {
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
    const chargesTotal = (invoice.additionalCharges || []).reduce((acc, charge) => acc + (charge.amount || 0), 0);
    const grandTotal = sub + tax + chargesTotal;
    
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
      additionalChargesTotal: chargesTotal,
      total: grandTotal,
      totalQuantity: totalQty,
      totalRate: totalRt,
      roundOff: ro,
      finalTotal: ft
    };
  }, [invoice.items, invoice.additionalCharges, invoice.roundOffApplied]);

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
  
  const generateQuotationHTML = () => {
    const quotationItemsHtml = invoice.items && invoice.items.length > 0 ? (
      invoice.items.map((item, index) => `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td>${item.productName || item.description || ''}</td>
          <td class="text-right">₹${(item.price || 0).toFixed(2)}</td>
        </tr>
      `).join('')
    ) : `<tr><td colspan="3" class="text-center" style="height: 100px; vertical-align: middle;">No items quoted</td></tr>`;

    return `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Quotation - ${invoice.invoiceNumber}</title>
          <style>
            @page { size: A4; margin: 20mm; } 
            body { font-family: 'Arial', sans-serif; color: #000; font-size: 12pt; line-height: 1.5; }
            .quotation-container { width: 100%; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .title { text-align: center; font-weight: bold; font-size: 22pt; margin-bottom: 1mm; color: #000; }
            .company-address, .company-contact { text-align: center; font-size: 9pt; margin-bottom: 0.8mm; color: #000; }
            .company-contact { margin-bottom: 3mm; }
            .subtitle { text-align: center; font-size: 14pt; margin-bottom: 1.5mm; font-weight: bold; text-transform: uppercase; color: #000;}
            hr { border: 0; border-top: 1px solid #000; margin: 15px 0; }
            .meta-info { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
            .to-address { width: 60%; }
            .date { width: 40%; text-align: right; }
            .letter-body { margin-bottom: 20px; }
            .letter-body p { margin: 0 0 10px 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { font-weight: bold; background-color: #f2f2f2; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .footer-notes { margin-top: 20px; font-size: 11pt; }
            .footer { margin-top: 40px; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="quotation-container">
            <div class="header">
              <div class="title">${company?.name || 'SEAFARER’S NAVAL TAILORS'}</div>
              <div class="company-address">${company?.address || 'New no 19, old no 9, Linghi chetty st, Mannady, Chennai- 600001.'}</div>
              <div class="company-contact">
                Phone: ${company?.phone || ''}${company?.phone2 ? `, ${company.phone2}` : ''} | 
                Email: ${company?.email || ''} | 
                GSTIN: ${company?.gstin || ''}
              </div>
              <div class="subtitle">Quotation</div>
            </div>
            <hr/>
            <div class="meta-info">
              <div class="to-address">
                To,<br/>
                <strong>${invoice.customerName}</strong><br/>
                ${invoice.customerAddress ? invoice.customerAddress.replace(/\n/g, '<br/>') : ''}
              </div>
              <div class="date">
                <strong>Date:</strong> ${format(new Date(invoice.invoiceDate), "dd/MM/yyyy")}
              </div>
            </div>
            <div class="letter-body">
              <p>Dear Sir,</p>
              <p><strong>Sub: Quotation - ${invoice.notes || "Supply of Goods"} - Reg</strong></p>
              <p>We thank you for your enquiry and have pleasure in submitting hereunder our quotation for the same. Which we trust, will meet with your kind approval.</p>
              <p>Thanking you,</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th class="text-center" style="width: 10%;">S.no</th>
                  <th>Description</th>
                  <th class="text-right" style="width: 25%;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${quotationItemsHtml}
              </tbody>
            </table>
            <div class="footer-notes">
              <strong>Note:</strong>
              <div style="white-space: pre-wrap;">${invoice.termsAndConditions || 'GST will be applicable as per government norms.'}</div>
            </div>
            <div class="footer">
              <p>Regards,<br/><strong>For ${company?.name || 'SEAFARER NAVEL TAILORS'}</strong></p>
              <br/><br/>
              <hr/>
              <p class="text-center" style="font-size: 10pt;">IF YOU HAVE ANY QUESTION REGARDING THIS QUOTATION. CONTACT US.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const generateInvoiceHTML = () => {
    if (invoiceType === 'quotation') {
      return generateQuotationHTML();
    }
    
    // Fallback to original Tax Invoice format
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
            <td class="text-right">₹${subtotal.toFixed(2)}</td>
          </tr>
        `;
      }).join('')
    ) : `<tr><td colspan="9" class="text-center" style="height: 100px; vertical-align: middle;">No items</td></tr>`;

    const targetItemRows = 15;
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
    
    const additionalChargesHtml = (invoice.additionalCharges || [])
      .map(charge => `
        <div class="summary-row">
          <span class="summary-label">${charge.description}:</span> 
          <span class="summary-value">₹${(charge.amount || 0).toFixed(2)}</span>
        </div>
      `).join('');

    return `
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice - ${invoice.invoiceNumber}</title>
        <style>
          @page { size: A4; margin: 8mm; } 
          * { box-sizing: border-box; }
          body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; color: #333; font-size: 8.5pt; line-height: 1.3; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;}
          .invoice-box { width: 100%; margin: 0 auto; padding: 0; } 
          .title { text-align: center; font-weight: bold; font-size: 22pt; margin-bottom: 1mm; color: #000; }
          .company-address, .company-contact { text-align: center; font-size: 9pt; margin-bottom: 0.8mm; color: #000; }
          .company-contact { margin-bottom: 3mm; }
          .subtitle { text-align: center; font-size: 14pt; margin-bottom: 1.5mm; font-weight: bold; text-transform: uppercase; color: #000;}
          .info-container { display: flex; width: 100%; margin-bottom: 2.5mm; }
          .info-box { border: 1px solid #000; flex: 1; margin: 0 0.5mm; display: flex; flex-direction: column; }
          .info-box-title { font-weight: bold; padding: 1mm; border-bottom: 1px solid #000; background-color: #f0f0f0; text-align: center; font-size: 7.5pt;}
          .info-content { padding: 1.5mm; font-size: 7.5pt; flex-grow: 1; }
          .info-row { margin-bottom: 0.8mm; }
          .info-row strong { display: inline-block; min-width: 70px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 2.5mm; table-layout: fixed; }
          th, td { border: 1px solid #000; padding: 1mm; vertical-align: top; font-size: 7.5pt; word-wrap: break-word; } 
          th { background-color: #f0f0f0; text-align: center; font-weight: bold;}
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .amount-word { margin: 2mm 0; font-size: 7.5pt; } 
          .summary-box-container { display: flex; width: 100%; margin-bottom: 2.5mm; }
          .bank-details, .notes-box, .summary-totals { border: 1px solid #000; display: flex; flex-direction: column; font-size: 7.5pt;}
          .bank-details { flex: 1.2; margin-right: 1mm;}
          .notes-box { flex: 1.2; margin-right: 1mm;}
          .summary-totals { flex: 1; }
          .box-title { font-weight: bold; padding: 1mm; border-bottom: 1px solid #000; background-color: #f0f0f0; text-align: center;}
          .box-content { padding: 1.5mm; flex-grow: 1; }
          .box-content .info-row { margin-bottom: 1mm; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 0.8mm; }
          .summary-label { font-weight: normal; }
          .summary-value { font-weight: bold; }
          .grand-total .summary-label, .grand-total .summary-value { font-weight: bold; font-size: 8.5pt; }
          .terms-box { margin-top: 2.5mm; border: 1px solid #000; font-size: 7.5pt; }
          .terms-box .box-content { white-space: pre-wrap; padding: 1.5mm; }
          .signatures { display: flex; justify-content: space-between; margin-top: 5mm; padding-top: 3mm; border-top: 1px dashed #ccc;}
          .signature-box { width: 48%; text-align: center; font-size: 7.5pt; }
          .signature-line { margin-top: 12mm; border-top: 1px solid #000; padding-top: 1mm; }
          .original-mark { text-align: right; margin-bottom: 1.5mm; font-weight: bold; font-size: 8.5pt; }
          .empty-row td { height: 5mm; border-left: 1px solid #000; border-right: 1px solid #000; border-top: 1px dotted #eee; border-bottom: 1px dotted #eee; } 
          .empty-row td:first-child { border-left: 1px solid #000; }
          .empty-row td:last-child { border-right: 1px solid #000; }
          .item-table-footer td { font-weight: bold; }
          @media print {
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .invoice-box { width: 100%; margin: 0; padding: 0; }
            .title, .subtitle, .company-address, .company-contact, .info-box-title, th, .box-title, .info-content, .info-row, .amount-word, .box-content, .summary-row, .terms-box .box-content, .signature-box, .original-mark, td { 
              color: #000 !important; 
            }
            .info-box, .bank-details, .notes-box, .summary-totals, .terms-box, table, th, td { 
              border-color: #000 !important; 
            }
            .info-box-title, th, .box-title { background-color: #f0f0f0 !important; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="original-mark">${getCurrentDocumentType()}</div>
          <div class="title">${company?.name || 'Your Company Name'}</div>
          <div class="company-address">${company?.address || 'Your Company Address'}</div>
          <div class="company-contact">
            Phone: ${company?.phone || 'N/A'} ${company?.phone2 ? ` / ${company.phone2}` : ''} | 
            Email: ${company?.email || 'N/A'} | 
            GSTIN: ${company?.gstin || 'N/A'}
          </div>
          <div class="subtitle">${getCurrentInvoiceTypeTitle()}</div>

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
                <td class="text-right"></td>
                <td class="text-center"></td>
                <td class="text-center"></td>
                <td class="text-center"></td>
                <td class="text-right">₹${subtotal.toFixed(2)}</td>
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
                ${additionalChargesHtml}
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
    if (!printRef.current && !invoice) return;
    
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
          printWindow.focus(); 
          printWindow.print();
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
            <Printer className="mr-2 h-4 w-4" /> Print: {getCurrentInvoiceTypeTitle()}
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
              <Label htmlFor="transport">Triplicate for Supplier</Label>
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
              height: `calc(100% / ${zoomLevel})`, 
              width: `calc(100% / ${zoomLevel})`  
            }}
          ></iframe>
        </div>
      )}
      
      <div ref={printRef} className="hidden print-this-area">
      </div>
    </div>
  );
}
