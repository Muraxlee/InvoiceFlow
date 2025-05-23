import { NextResponse } from 'next/server';
import { getCompanyInfo, saveCompanyInfo } from '@/lib/database-actions';
import { revalidatePath } from 'next/cache';

export async function GET() {
  try {
    const company = await getCompanyInfo();
    
    if (!company) {
      return NextResponse.json({}, { status: 404 });
    }
    
    return NextResponse.json(company);
  } catch (error) {
    console.error('Error in company GET API route:', error);
    return NextResponse.json({ error: 'Failed to fetch company information' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const success = await saveCompanyInfo(data);
    
    if (success) {
      revalidatePath('/settings');
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to save company information' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in company POST API route:', error);
    return NextResponse.json({ error: 'Failed to save company information' }, { status: 500 });
  }
} 