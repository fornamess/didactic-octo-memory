import { SUPPORT_EMAIL, SUPPORT_TELEGRAM } from '@/lib/config';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    telegram: SUPPORT_TELEGRAM,
    email: SUPPORT_EMAIL,
  });
}
