import { NextResponse } from 'next/server';
import { getInvoiceById, deleteInvoice } from '@/lib/database-actions';
import { revalidatePath } from 'next/cache';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const invoice = await getInvoiceById(params.id);
    
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    return NextResponse.json(invoice);
  } catch (error) {
    console.error(`Error in invoice GET API route for ID ${params.id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const success = await deleteInvoice(params.id);
    
    if (success) {
      revalidatePath('/invoices');
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
    }
  } catch (error) {
    console.error(`Error in invoice DELETE API route for ID ${params.id}:`, error);
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
  }
} 