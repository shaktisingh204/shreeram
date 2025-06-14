
"use client";

import { useEffect, useState } from 'react';
import { getStudentById, getPayments, getPaymentTypeById, getSeatById } from '@/lib/data'; 
import type { Student, FeePayment, PaymentType, Seat } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, DollarSign, Loader2, User, StickyNote, Armchair, CalendarDays, Briefcase, Phone, Home, UserCircle2, AlertTriangle, Library, Fingerprint } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast'; 

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const { currentLibraryId, currentLibraryName, loading: authLoading } = useAuth();
  const { toast } = useToast(); 

  const [student, setStudent] = useState<Student | null>(null);
  const [assignedSeat, setAssignedSeat] = useState<Seat | null>(null);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [paymentType, setPaymentType] = useState<PaymentType | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (studentId && currentLibraryId && !authLoading) {
      const fetchData = async () => {
        setLoadingData(true);
        try {
          const studentData = await getStudentById(currentLibraryId, studentId);
          if (!studentData) {
            toast({ title: "Not Found", description: `Student not found in ${currentLibraryName || 'this library'}.`, variant: "destructive" });
            router.push('/students'); 
            return;
          }
          setStudent(studentData);

          if (studentData.seatId) {
            const seatData = await getSeatById(currentLibraryId, studentData.seatId);
            setAssignedSeat(seatData || null);
          } else {
            setAssignedSeat(null);
          }

          const paymentData = await getPayments(currentLibraryId); 
          setPayments(paymentData.filter(p => p.studentId === studentId).sort((a,b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()));


          if (studentData.paymentTypeId) { 
            const planData = await getPaymentTypeById(currentLibraryId, studentData.paymentTypeId); 
            if (planData) setPaymentType(planData); 
          }

        } catch (error) {
          console.error("Error fetching student details:", error);
          toast({ title: "Error", description: `Could not fetch student details for ${currentLibraryName || 'this library'}.`, variant: "destructive" });
        } finally {
          setLoadingData(false);
        }
      };
      fetchData();
    } else if (!authLoading && !currentLibraryId) {
        setLoadingData(false); 
        toast({ title: "Context Error", description: "No library selected to view student details.", variant: "destructive" });
    }
  }, [studentId, currentLibraryId, authLoading, router, currentLibraryName, toast]);
  
  const getStatusBadgeVariant = (status: Student['status'] | undefined, feesDue: number | undefined) => {
    if (status === 'inactive') return 'secondary';
    if (feesDue !== undefined && feesDue > 0) return 'destructive';
    return 'default'; 
  };
  
  const getStatusBadgeText = (status: Student['status'] | undefined, feesDue: number | undefined) => {
    if (status === 'inactive') return 'Inactive';
    if (feesDue !== undefined && feesDue > 0) return 'Has Dues';
    if (feesDue !== undefined && feesDue < 0) return 'Credit';
    return 'Active/Paid';
  };

  const formatFeesDueDisplay = (fees: number | undefined) => {
    if (fees === undefined) return "N/A";
    if (fees < 0) return `INR ${(-fees).toFixed(2)} (Credit)`;
    if (fees > 0) return `INR ${fees.toFixed(2)} (Due)`;
    return "INR 0.00 (Cleared)";
  };


  if (authLoading || loadingData) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!currentLibraryId) {
    return (
      <div className="flex flex-col justify-center items-center h-full text-center p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-xl font-semibold">No Library Selected</p>
        <p className="text-muted-foreground">A library context is required to view student details. Please select a library.</p>
         <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }


  if (!student) {
    return <div className="text-center py-12">Student not found in {currentLibraryName || 'the current library'}.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()} className="flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Student List
        </Button>
        <Link href={`/students/edit/${student.id}`} passHref>
          <Button>
            <Edit className="mr-2 h-4 w-4" /> Edit Student
          </Button>
        </Link>
      </div>

      <Card className="shadow-xl">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center gap-4 p-6 bg-muted/30 rounded-t-lg">
          <Avatar className="h-24 w-24 border-4 border-primary">
            <AvatarImage src={student.photoUrl || `https://placehold.co/100x100/663399/FFFFFF?text=${student.fullName.charAt(0)}`} alt={student.fullName} data-ai-hint="student photo"/>
            <AvatarFallback className="text-3xl">{student.fullName.slice(0,2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-3xl font-headline text-primary">{student.fullName}</CardTitle>
            <div className="flex items-center text-sm text-muted-foreground">
              <Library className="h-4 w-4 mr-1.5 text-accent" />
              <span>{currentLibraryName || 'Selected Library'}</span>
              {student.fatherName && <span className="mx-1.5">|</span>}
              {student.fatherName && <span>S/o {student.fatherName}</span>}
            </div>
            <Badge variant={getStatusBadgeVariant(student.status, student.feesDue)} className="capitalize mt-2 text-sm">
              {getStatusBadgeText(student.status, student.feesDue)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4 md:col-span-2">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2 mb-3">Contact & Personal Info</h3>
            {student.aadhaarNumber && <InfoItem icon={Fingerprint} label="Aadhaar Number" value={student.aadhaarNumber} />}
            {student.mobileNumber && <InfoItem icon={Phone} label="Mobile Number" value={student.mobileNumber} />}
            {student.fatherName && <InfoItem icon={UserCircle2} label="Father's Name" value={student.fatherName} />}
            {student.address && <InfoItem icon={Home} label="Address" value={student.address} />}
            <InfoItem icon={CalendarDays} label="Joined On" value={new Date(student.enrollmentDate).toLocaleDateString()} />
            {assignedSeat && <InfoItem icon={Armchair} label="Assigned Seat" value={`${assignedSeat.seatNumber} (Floor: ${assignedSeat.floor})`} />}
            {student.notes && <InfoItem icon={StickyNote} label="Notes" value={student.notes} />}
          </div>
          <div className="space-y-4 md:col-span-1">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2 mb-3">Fee Details</h3>
            <InfoItem icon={DollarSign} label="Current Balance" value={formatFeesDueDisplay(student.feesDue)} className={student.feesDue > 0 ? "text-destructive font-bold" : (student.feesDue < 0 ? "text-green-600 font-bold" : "")} />
            {student.lastPaymentDate && <InfoItem icon={CalendarDays} label="Last Payment" value={new Date(student.lastPaymentDate).toLocaleDateString()} />}
            {paymentType && <InfoItem icon={Briefcase} label="Payment Type" value={`${paymentType.name} (INR${paymentType.amount}/${paymentType.frequency})`} />}
          </div>
           {student.idProofUrl && (
            <div className="md:col-span-3 space-y-2 pt-4 border-t">
                 <h3 className="text-lg font-semibold text-foreground pb-2 mb-2">ID Proof</h3>
                <a href={student.idProofUrl} target="_blank" rel="noopener noreferrer" className="block w-full md:w-1/3">
                    <Image src={student.idProofUrl} alt="ID Proof" width={400} height={300} className="rounded-md object-cover border hover:opacity-80 transition-opacity" data-ai-hint="identification document"/>
                </a>
            </div>
            )}
        </CardContent>
      </Card>

      {payments.length > 0 && (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary">Payment History</CardTitle>
            <CardDescription>List of payments made by this student in {currentLibraryName || 'this library'}.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                      <TableCell>INR{payment.amount.toFixed(2)}</TableCell>
                      <TableCell>{payment.notes || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface InfoItemProps {
  icon: React.ElementType;
  label: string;
  value: string;
  className?: string;
}

function InfoItem({ icon: Icon, label, value, className }: InfoItemProps) {
  return (
    <div className="flex items-start">
      <Icon className="h-5 w-5 text-accent mr-3 mt-1 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className={`text-foreground ${className}`}>{value}</p>
      </div>
    </div>
  );
}
