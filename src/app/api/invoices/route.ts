import { NextResponse } from 'next/server';
import { getAllInvoices, saveInvoice } from '@/lib/database-actions';
import { revalidatePath } from 'next/cache';

export async function GET() {
  try {
    const invoices = await getAllInvoices();
    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Error in invoices API route:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const success = await saveInvoice(data);
    
    if (success) {
      revalidatePath('/invoices');
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to save invoice' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in invoices POST API route:', error);
    return NextResponse.json({ error: 'Failed to save invoice' }, { status: 500 });
  }
} 