
"use client";

import { useEffect, useState, useMemo } from 'react';
import { getStudents, getPayments, addPayment, markFeesAsPaid as markFeesAsPaidAction, getPaymentTypes } from '@/lib/data';
import type { Student, FeePayment, PaymentType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { DollarSign, PlusCircle, CheckCircle, Loader2, History, Search, MoreHorizontal, AlertTriangle, FileText, Library } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';


interface PaymentFormData {
  studentId: string;
  amount: number;
  paymentDate: string;
  notes?: string;
}

export default function FeeCollectionPage() {
  const { currentLibraryId, currentLibraryName, isSuperAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    studentId: '',
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); 


  const fetchData = async () => {
    if(authLoading) {
      setLoadingData(true);
      return;
    }
    if(isSuperAdmin || currentLibraryId) {
      setLoadingData(true);
      try {
        const studentData = await getStudents(currentLibraryId);
        const paymentData = await getPayments(currentLibraryId);
        const paymentTypeData = await getPaymentTypes(currentLibraryId);
        setStudents(studentData);
        setPayments(paymentData);
        setPaymentTypes(paymentTypeData);
      } catch (error) {
        toast({ title: "Error", description: `Failed to fetch fee data for ${currentLibraryName || 'libraries'}.`, variant: "destructive" });
        setStudents([]);
        setPayments([]);
        setPaymentTypes([]);
      } finally {
        setLoadingData(false);
      }
    } else { 
        setLoadingData(false);
        setStudents([]);
        setPayments([]);
        setPaymentTypes([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentLibraryId, authLoading, isSuperAdmin, currentLibraryName]);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const nameMatch = student.fullName.toLowerCase().includes(searchTerm.toLowerCase());
      let statusMatch = true;
      if (statusFilter === 'hasDues') statusMatch = student.feesDue > 0 && student.status !== 'inactive';
      else if (statusFilter === 'allPaid') statusMatch = student.feesDue <= 0 && student.status === 'enrolled'; // <= 0 for paid or credit
      else if (statusFilter === 'inactive') statusMatch = student.status === 'inactive';
      
      return nameMatch && statusMatch;
    });
  }, [students, searchTerm, statusFilter]);


  const openPaymentDialog = (student: Student) => {
    if (!currentLibraryId && isSuperAdmin) {
      toast({ title: "Action Disabled", description: "Please select a specific library context (View As Manager) to add payments.", variant: "destructive" });
      return;
    }
    setCurrentStudent(student);
    // Default payment amount to their current dues if positive, otherwise a sensible default (e.g., 0 or typical plan amount)
    const defaultAmount = student.feesDue > 0 ? student.feesDue : 0; 
    setPaymentFormData({
      studentId: student.id,
      amount: defaultAmount,
      paymentDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setIsPaymentDialogOpen(true);
  };

  const openHistoryDialog = (student: Student) => {
    setCurrentStudent(student);
    setIsHistoryDialogOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent || !currentLibraryId) { 
        toast({ title: "Error", description: "A specific library context is required to add a payment.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    try {
      await addPayment(currentLibraryId, {
        studentId: currentStudent.id,
        amount: Number(paymentFormData.amount), 
        paymentDate: paymentFormData.paymentDate,
        notes: paymentFormData.notes,
      }, currentStudent.fullName); // Pass student name to avoid refetch in addPayment
      toast({ title: "Success", description: "Payment added successfully." });
      await fetchData(); 
      setIsPaymentDialogOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to add payment.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const markAsPaid = async (studentId: string) => {
    if (!currentLibraryId) { 
       toast({ title: "Error", description: "A specific library context is required to clear dues.", variant: "destructive" });
       return;
    }
    setIsSubmitting(true);
    try {
      await markFeesAsPaidAction(currentLibraryId, studentId);
      toast({ title: "Success", description: "Dues cleared." });
      await fetchData(); 
    } catch (error) {
      toast({ title: "Error", description: "Failed to clear dues.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStudentPayments = () => {
    if (!currentStudent) return [];
    return payments.filter(p => p.studentId === currentStudent.id).sort((a,b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  };
  
  const getStudentPaymentTypeName = (student: Student) => {
    const plan = paymentTypes.find(fp => fp.id === student.paymentTypeId && (!isSuperAdmin || fp.libraryName === student.libraryName));
    return plan ? `${plan.name} (INR${plan.amount})` : 'No Plan';
  };

  const formatFeesDueDisplay = (fees: number | undefined) => {
    if (fees === undefined) return { text: "N/A", className: ""};
    if (fees < 0) return { text: `INR ${(-fees).toFixed(2)} (Credit)`, className: "text-green-600 font-semibold" };
    if (fees > 0) return { text: `INR ${fees.toFixed(2)} (Due)`, className: "text-destructive font-semibold" };
    return { text: "INR 0.00 (Cleared)", className: "text-green-600" };
  };
  
  const getStatusBadgeVariant = (status: Student['status'] | undefined, feesDue: number | undefined) => {
    if (status === 'inactive') return 'secondary';
    if (feesDue !== undefined && feesDue > 0) return 'destructive'; // Owing
    return 'default'; // Enrolled (Paid or Credit)
  };
  
  const getStatusBadgeText = (status: Student['status'] | undefined, feesDue: number | undefined) => {
    if (status === 'inactive') return 'Inactive';
    if (feesDue !== undefined && feesDue > 0) return 'Has Dues';
    if (feesDue !== undefined && feesDue < 0) return 'Credit'; // Student has overpaid
    return 'Active/Paid';
  };
  
  if (authLoading || loadingData) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin && !currentLibraryId) {
    return (
      <div className="flex flex-col justify-center items-center h-full text-center p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-xl font-semibold">No Library Selected / User Misconfiguration</p>
        <p className="text-muted-foreground">Please ensure your user account is correctly set up with a library.</p>
        <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }

  const pageTitle = isSuperAdmin && !currentLibraryId ? "All Fee Collections (All Libraries)" : `Fee Collection (${currentLibraryName || 'Selected Library'})`;
  const canManageFees = !!currentLibraryId; 

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-headline font-bold text-primary">{pageTitle}</h1>
            {currentLibraryName && <p className="text-md text-muted-foreground flex items-center"><Library className="h-4 w-4 mr-2 text-accent" />Managing for: <span className="font-semibold ml-1">{currentLibraryName}</span></p>}
            {isSuperAdmin && !currentLibraryId && <p className="text-md text-muted-foreground">Displaying fee status from all libraries. Select a library via "View As Manager" to manage specific fees.</p>}
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search students..."
              className="pl-8 w-full sm:w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
           <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              <SelectItem value="hasDues">Has Dues</SelectItem>
              <SelectItem value="allPaid">Paid / Credit</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Student Fee Status</CardTitle>
          <CardDescription>See student payments and balances {currentLibraryName ? `for ${currentLibraryName}` : (isSuperAdmin ? "across all libraries" : "")}.</CardDescription>
        </CardHeader>
        <CardContent>
        {filteredStudents.length > 0 ? (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  {isSuperAdmin && !currentLibraryId && <TableHead>Library</TableHead>}
                  <TableHead>Payment Type</TableHead>
                  <TableHead>Current Balance</TableHead>
                  <TableHead>Last Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => {
                  const balanceDisplay = formatFeesDueDisplay(student.feesDue);
                  return (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.fullName}</TableCell>
                    {isSuperAdmin && !currentLibraryId && <TableCell>{student.libraryName || 'N/A'}</TableCell>}
                    <TableCell>{getStudentPaymentTypeName(student)}</TableCell>
                    <TableCell className={balanceDisplay.className}>
                      {balanceDisplay.text}
                    </TableCell>
                    <TableCell>{student.lastPaymentDate ? new Date(student.lastPaymentDate).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(student.status, student.feesDue)} className="capitalize">
                        {getStatusBadgeText(student.status, student.feesDue)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" disabled={(isSubmitting && currentStudent?.id === student.id) || !canManageFees} title={!canManageFees ? "Select library to manage fees" : "Actions"}>
                            {(isSubmitting && currentStudent?.id === student.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {student.status !== 'inactive' && (
                            <>
                              <DropdownMenuItem onClick={() => openPaymentDialog(student)} disabled={isSubmitting}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Payment
                              </DropdownMenuItem>
                              {student.feesDue > 0 && (
                                <DropdownMenuItem onClick={() => markAsPaid(student.id)} disabled={isSubmitting}>
                                  <CheckCircle className="mr-2 h-4 w-4" /> Clear Dues
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                          <DropdownMenuItem onClick={() => openHistoryDialog(student)}>
                            <History className="mr-2 h-4 w-4" /> Payment History
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
           ) : (
             <div className="text-center py-12">
                {searchTerm || statusFilter !== 'all' ?
                    <Search className="mx-auto h-12 w-12 text-muted-foreground" /> :
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" /> 
                }
                <h3 className="mt-2 text-xl font-semibold">
                    {searchTerm || statusFilter !== 'all' ? 'No Students Match Filter' : 'No Student Fee Data'}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    {searchTerm || statusFilter !== 'all' ? 
                        "Try adjusting your search or filter criteria." :
                        `No student fee information to display ${currentLibraryName ? `for ${currentLibraryName}` : (isSuperAdmin ? "across all libraries" : "")}.`
                    }
                </p>
            </div>
           )}
        </CardContent>
      </Card>

      {/* Add Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment for {currentStudent?.fullName}</DialogTitle>
            <DialogDescription>Record a new payment for this student. This will apply to {currentLibraryName || "the selected library context"}. Current balance: {formatFeesDueDisplay(currentStudent?.feesDue).text}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="amount">Amount Paid (INR)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentFormData.paymentDate}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={paymentFormData.notes ?? ""}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />} Add Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment History for {currentStudent?.fullName}</DialogTitle>
            <DialogDescription>Displaying payments for this student {currentLibraryName ? `within ${currentLibraryName}` : (isSuperAdmin && !currentStudent?.libraryName ? "(across all libraries if applicable)" : `within library ${currentStudent?.libraryName}`)}.</DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            {getStudentPayments().length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getStudentPayments().map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{new Date(p.paymentDate).toLocaleDateString()}</TableCell>
                      <TableCell>INR{p.amount.toFixed(2)}</TableCell>
                      <TableCell>{p.notes || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground">No payment history for this student.</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

