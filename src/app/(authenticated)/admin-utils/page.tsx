
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { getStudents, getSeats, getPayments, getPaymentTypes, getLibrariesMetadata, getUsersMetadata } from '@/lib/data';
import type { Student, Seat, FeePayment, PaymentType, LibraryMetadata, UserMetadata } from '@/types';
import { Loader2, Download, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx'; // For Excel export

export default function AdminUtilitiesPage() {
  const { isSuperAdmin, currentLibraryId, currentLibraryName, loading: authLoading } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExportData = async (dataType: 'students' | 'seats' | 'payments' | 'paymentTypes' | 'libraries' | 'users') => {
    if (!isSuperAdmin && !currentLibraryId) {
      toast({ title: "Error", description: "Please select a library context to export data.", variant: "destructive" });
      return;
    }
    setIsExporting(true);
    try {
      let data: any[] = [];
      let fileName = `${currentLibraryName?.replace(/\s+/g, '_') || 'All_Libraries'}_${dataType}_export.xlsx`;
      
      const libraryContextForFetch = isSuperAdmin && !currentLibraryId ? null : currentLibraryId;

      switch (dataType) {
        case 'students':
          data = await getStudents(libraryContextForFetch);
          data = data.map((s: Student) => ({
            "Student ID": s.id,
            "Full Name": s.fullName,
            "Aadhaar Number": s.aadhaarNumber,
            "Mobile Number": s.mobileNumber,
            "Father's Name": s.fatherName,
            "Address": s.address,
            "Enrollment Date": s.enrollmentDate,
            "Status": s.status,
            "Fees Due": s.feesDue,
            "Last Payment Date": s.lastPaymentDate,
            "Seat ID": s.seatId,
            "Payment Type ID": s.paymentTypeId,
            "Notes": s.notes,
            "Library Name": s.libraryName || currentLibraryName || 'N/A',
          }));
          break;
        case 'seats':
          data = await getSeats(libraryContextForFetch);
          data = data.map((s: Seat) => ({
            "Seat ID": s.id,
            "Seat Number": s.seatNumber,
            "Floor": s.floor,
            "Is Occupied": s.isOccupied,
            "Student ID": s.studentId,
            "Student Name": s.studentName,
            "Library Name": s.libraryName || currentLibraryName || 'N/A',
          }));
          break;
        case 'payments':
            data = await getPayments(libraryContextForFetch);
            data = data.map((p: FeePayment) => ({
                "Payment ID": p.id,
                "Student ID": p.studentId,
                "Student Name": p.studentName,
                "Amount": p.amount,
                "Payment Date": p.paymentDate,
                "Notes": p.notes,
                "Library Name": p.libraryName || currentLibraryName || 'N/A',
            }));
            break;
        case 'paymentTypes':
            data = await getPaymentTypes(libraryContextForFetch);
            data = data.map((pt: PaymentType) => ({
                "Payment Type ID": pt.id,
                "Name": pt.name,
                "Amount": pt.amount,
                "Frequency": pt.frequency,
                "Library Name": pt.libraryName || currentLibraryName || 'N/A',
            }));
            break;
        case 'libraries':
            if (!isSuperAdmin) {
                 toast({ title: "Access Denied", description: "Only Superadmins can export all library metadata.", variant: "destructive" });
                 setIsExporting(false);
                 return;
            }
            data = await getLibrariesMetadata();
            fileName = `All_Libraries_Metadata_export.xlsx`;
            break;
        case 'users':
            if (!isSuperAdmin) {
                 toast({ title: "Access Denied", description: "Only Superadmins can export user metadata.", variant: "destructive" });
                 setIsExporting(false);
                 return;
            }
            data = await getUsersMetadata();
             data = data.map((u: UserMetadata) => ({
                "User ID": u.id,
                "Display Name": u.displayName,
                "Email": u.email,
                "Role": u.role,
                "Assigned Library ID": u.assignedLibraryId,
                "Assigned Library Name": u.assignedLibraryName,
                "Mobile Number": u.mobileNumber
            }));
            fileName = `All_Users_Metadata_export.xlsx`;
            break;
        default:
          throw new Error("Invalid data type for export");
      }

      if (data.length === 0) {
        toast({ title: "No Data", description: `No data found for ${dataType} to export.`, variant: "default" });
        setIsExporting(false);
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, dataType.charAt(0).toUpperCase() + dataType.slice(1));
      XLSX.writeFile(workbook, fileName);

      toast({ title: "Export Successful", description: `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} data exported to ${fileName}.` });
    } catch (error) {
      console.error(`Export error for ${dataType}:`, error);
      toast({ title: "Export Error", description: `Failed to export ${dataType} data. ${(error as Error).message}`, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-headline font-bold text-primary">Export Data</h1>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Export Data to Excel</CardTitle>
          <CardDescription>
            Download various data sets from the application for offline use or reporting.
            {isSuperAdmin && !currentLibraryId && " Exports will include data from all libraries."}
            {currentLibraryName && ` Current context: ${currentLibraryName}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Button onClick={() => handleExportData('students')} disabled={isExporting} className="w-full justify-start">
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export Students
          </Button>
          <Button onClick={() => handleExportData('seats')} disabled={isExporting} className="w-full justify-start">
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export Seats
          </Button>
          <Button onClick={() => handleExportData('payments')} disabled={isExporting} className="w-full justify-start">
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export Payments
          </Button>
          <Button onClick={() => handleExportData('paymentTypes')} disabled={isExporting} className="w-full justify-start">
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export Payment Types
          </Button>
          {isSuperAdmin && (
            <>
             <Button onClick={() => handleExportData('libraries')} disabled={isExporting} className="w-full justify-start">
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export Library Metadata
            </Button>
            <Button onClick={() => handleExportData('users')} disabled={isExporting} className="w-full justify-start">
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export User Metadata
            </Button>
            </>
          )}
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">Exports are generated on your browser. For large datasets, this may take a moment.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
