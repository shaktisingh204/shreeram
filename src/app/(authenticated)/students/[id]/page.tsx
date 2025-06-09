"use client";

import { useEffect, useState } from 'react';
import { getStudentById, getPayments, getFeePlanById, getSeatById } from '@/lib/data'; 
import type { Student, FeePayment, FeePlan, Seat } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, DollarSign, Loader2, User, Mail, StickyNote, Armchair, CalendarDays, Briefcase } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [assignedSeat, setAssignedSeat] = useState<Seat | null>(null);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [feePlan, setFeePlan] = useState<FeePlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentId) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const studentData = await getStudentById(studentId);
          if (!studentData) {
            router.push('/students'); 
            return;
          }
          setStudent(studentData);

          if (studentData.seatId) {
            const seatData = await getSeatById(studentData.seatId);
            setAssignedSeat(seatData || null);
          } else {
            setAssignedSeat(null);
          }

          const paymentData = await getPayments(); 
          setPayments(paymentData.filter(p => p.studentId === studentId));

          if (studentData.feePlanId) {
            const planData = await getFeePlanById(studentData.feePlanId);
            if (planData) setFeePlan(planData);
          }

        } catch (error) {
          console.error("Error fetching student details:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [studentId, router]);
  
  const getStatusBadgeVariant = (status: Student['status'] | undefined) => {
    if (!status) return 'outline';
    switch (status) {
      case 'enrolled': return 'default';
      case 'owing': return 'destructive';
      case 'inactive': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return <div className="text-center py-12">Student not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()} className="flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Students
        </Button>
        <Link href={`/students/edit/${student.id}`} passHref legacyBehavior>
          <Button>
            <Edit className="mr-2 h-4 w-4" /> Edit Student
          </Button>
        </Link>
      </div>

      <Card className="shadow-xl">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center gap-4 p-6 bg-muted/30 rounded-t-lg">
          <Avatar className="h-24 w-24 border-4 border-primary">
            <AvatarImage src={student.photoUrl || `https://placehold.co/100x100/663399/FFFFFF?text=${student.fullName.charAt(0)}`} alt={student.fullName} data-ai-hint="student photo" />
            <AvatarFallback className="text-3xl">{student.fullName.slice(0,2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-3xl font-headline text-primary">{student.fullName}</CardTitle>
            <Badge variant={getStatusBadgeVariant(student.status)} className="capitalize mt-1 text-sm">
              {student.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2 mb-2">Personal Information</h3>
            <InfoItem icon={Mail} label="Contact Email" value={student.contactDetails} />
            <InfoItem icon={CalendarDays} label="Enrollment Date" value={new Date(student.enrollmentDate).toLocaleDateString()} />
            {assignedSeat && <InfoItem icon={Armchair} label="Assigned Seat" value={`${assignedSeat.seatNumber} (Floor: ${assignedSeat.floor})`} />}
            {student.notes && <InfoItem icon={StickyNote} label="Notes" value={student.notes} />}
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2 mb-2">Financial Information</h3>
            <InfoItem icon={DollarSign} label="Fees Due" value={`$${student.feesDue.toFixed(2)}`} className={student.feesDue > 0 ? "text-destructive font-bold" : ""} />
            {student.lastPaymentDate && <InfoItem icon={CalendarDays} label="Last Payment" value={new Date(student.lastPaymentDate).toLocaleDateString()} />}
            {feePlan && <InfoItem icon={Briefcase} label="Fee Plan" value={`${feePlan.name} ($${feePlan.amount}/${feePlan.frequency})`} />}
          </div>
           {student.idProofUrl && (
            <div className="md:col-span-2 space-y-2">
                 <h3 className="text-lg font-semibold text-foreground border-b pb-2 mb-2">ID Proof</h3>
                <a href={student.idProofUrl} target="_blank" rel="noopener noreferrer" className="block w-full md:w-1/2">
                    <Image src={student.idProofUrl} alt="ID Proof" width={400} height={300} className="rounded-md object-cover border hover:opacity-80 transition-opacity" data-ai-hint="identification document" />
                </a>
            </div>
            )}
        </CardContent>
      </Card>

      {payments.length > 0 && (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary">Payment History</CardTitle>
            <CardDescription>Record of payments made by this student.</CardDescription>
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
                      <TableCell>${payment.amount.toFixed(2)}</TableCell>
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
