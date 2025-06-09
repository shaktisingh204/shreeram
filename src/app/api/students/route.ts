
import { NextResponse } from 'next/server';
import { mockStudents } from '@/lib/data';

export async function GET() {
  // In a real application, you would fetch data from your database here.
  // For now, we're returning the mock data.
  // Adding a small delay to simulate a real API call.
  await new Promise(resolve => setTimeout(resolve, 300));
  return NextResponse.json(mockStudents);
}
