
"use client";

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getStudents, getSeats, deleteStudent } from '@/lib/data'; 
import type { Student, Seat } from '@/types'; 
import { PlusCircle, Search, Edit, Eye, Trash2, Loader2, MoreHorizontal, AlertTriangle, Users, Library } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


export default function StudentsPage() {
  const { currentLibraryId, currentLibraryName, isSuperAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loadingData, setLoadingData] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const fetchData = async () => {
    if (authLoading) {
      setLoadingData(true);
      return;
    }
    if (isSuperAdmin || currentLibraryId) {
      setLoadingData(true);
      try {
        const studentData = await getStudents(currentLibraryId); 
        const seatData = await getSeats(currentLibraryId); 
        setStudents(studentData);
        setSeats(seatData); 
      } catch (error) {
        console.error("Failed to fetch students or seats:", error);
        toast({ title: "Error", description: `Failed to fetch data for ${currentLibraryName || 'libraries'}.`, variant: "destructive" });
        setStudents([]);
        setSeats([]);
      } finally {
        setLoadingData(false);
      }
    } else { 
      setLoadingData(false);
      setStudents([]);
      setSeats([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentLibraryId, authLoading, isSuperAdmin, currentLibraryName, toast]);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const nameMatch = student.fullName.toLowerCase().includes(searchTerm.toLowerCase());
      let statusMatch = true; 
        if (statusFilter === 'enrolled') { 
            statusMatch = student.status === 'enrolled';
        } else if (statusFilter === 'owing') { 
            statusMatch = student.status === 'owing';
        } else if (statusFilter === 'inactive') { 
            statusMatch = student.status === 'inactive';
        }
      return nameMatch && statusMatch;
    });
  }, [students, searchTerm, statusFilter]);

  const handleDelete = async () => {
    if (!studentToDelete || !studentToDelete.libraryId) {
        toast({ title: "Error", description: "Student information is incomplete for deletion.", variant: "destructive" });
        return;
    }
    setIsDeleting(true);
    try {
        await deleteStudent(studentToDelete.libraryId, studentToDelete.id);
        toast({ title: "Success", description: `Student ${studentToDelete.fullName} has been deleted.` });
        setStudentToDelete(null);
        await fetchData();
    } catch (error) {
        toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
        setIsDeleting(false);
    }
  };

  const getStatusBadgeVariant = (status: Student['status'], feesDue: number) => {
    if (status === 'inactive') return 'secondary';
    if (feesDue > 0) return 'destructive'; 
    return 'default'; 
  };
  
  const getStatusBadgeText = (status: Student['status'], feesDue: number) => {
    if (status === 'inactive') return 'Inactive';
    if (feesDue > 0) return 'Has Dues';
    if (feesDue < 0) return 'Credit'; 
    return 'Active/Paid';
  };

  const formatFeesDueDisplay = (fees: number) => {
    if (fees < 0) return `INR ${(-fees).toFixed(2)} (Credit)`;
    if (fees > 0) return `INR ${fees.toFixed(2)} (Due)`;
    return "INR 0.00 (Cleared)";
  };

  const getStudentSeatDisplay = (studentSeatId?: string, studentLibraryName?: string) => {
    if (!studentSeatId) return 'N/A';
    const seat = seats.find(s => s.id === studentSeatId && (isSuperAdmin && !currentLibraryId ? s.libraryName === studentLibraryName : true));
    return seat ? `${seat.seatNumber} (${seat.floor}${isSuperAdmin && !currentLibraryId && seat.libraryName ? ` - ${seat.libraryName}` : ''})` : 'N/A';
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
        <p className="text-muted-foreground">Please ensure your manager account is correctly set up with a library.</p>
        <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }
  
  const pageTitle = isSuperAdmin && !currentLibraryId ? "All Students (All Libraries)" : `Students (${currentLibraryName || 'Selected Library'})`;
  const canPerformActions = !!currentLibraryId; 

  return (
    <TooltipProvider>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-headline font-bold text-primary">{pageTitle}</h1>
            {currentLibraryName && <p className="text-md text-muted-foreground flex items-center"><Library className="h-4 w-4 mr-2 text-accent" />Managing for: <span className="font-semibold ml-1">{currentLibraryName}</span></p>}
            {isSuperAdmin && !currentLibraryId && <p className="text-md text-muted-foreground">Displaying students from all libraries. Select a library from the header to manage or add students.</p>}
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
              <SelectValue placeholder="Show by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              <SelectItem value="enrolled">Active/Paid/Credit</SelectItem>
              <SelectItem value="owing">Has Dues</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full sm:w-auto"> 
                <Link href="/students/add" passHref legacyBehavior>
                  <Button className="w-full" disabled={!canPerformActions} aria-disabled={!canPerformActions}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Student
                  </Button>
                </Link>
              </div>
            </TooltipTrigger>
            {!canPerformActions && (
              <TooltipContent>
                <p>Select a specific library context to add students.</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>

      {filteredStudents.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border shadow-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Photo</TableHead>
                <TableHead>Full Name</TableHead>
                {isSuperAdmin && !currentLibraryId && <TableHead>Library</TableHead>}
                <TableHead>Aadhaar Number</TableHead>
                <TableHead>Seat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={student.photoUrl || `https://placehold.co/40x40/663399/FFFFFF?text=${student.fullName.charAt(0)}`} alt={student.fullName} data-ai-hint="student avatar"/>
                      <AvatarFallback>{student.fullName.slice(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{student.fullName}</TableCell>
                  {isSuperAdmin && !currentLibraryId && <TableCell>{student.libraryName || 'N/A'}</TableCell>}
                  <TableCell>{student.aadhaarNumber || 'N/A'}</TableCell>
                  <TableCell>{getStudentSeatDisplay(student.seatId, student.libraryName)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(student.status, student.feesDue)} className="capitalize">
                      {getStatusBadgeText(student.status, student.feesDue)}
                    </Badge>
                  </TableCell>
                  <TableCell className={student.feesDue > 0 ? "text-destructive" : (student.feesDue < 0 ? "text-green-600" : "")}>
                    {formatFeesDueDisplay(student.feesDue)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                         <Button variant="ghost" className="h-8 w-8 p-0" disabled={!canPerformActions} title={!canPerformActions ? "Select library to manage student" : "Actions"}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/students/${student.id}`} className="flex items-center">
                            <Eye className="mr-2 h-4 w-4" /> View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                           <Link href={`/students/edit/${student.id}`} className="flex items-center">
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive flex items-center" onClick={() => setStudentToDelete(student)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12">
          {searchTerm || statusFilter !== 'all' ? 
             <Search className="mx-auto h-12 w-12 text-muted-foreground" /> : 
             <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          }
          <h3 className="mt-2 text-xl font-semibold">No Students Found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchTerm || statusFilter !== 'all' ? "Try adjusting your search or filter criteria." : 
             (isSuperAdmin && !currentLibraryId && students.length > 0 ? "No students match current filters across all libraries." : `Get started by adding a new student to ${currentLibraryName || 'the selected library'}.`)}
          </p>
          {!(searchTerm || statusFilter !== 'all') && canPerformActions && (
             <Link href="/students/add">
                <Button className="mt-4">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Student
                </Button>
            </Link>
          )}
        </div>
      )}
       <AlertDialog open={!!studentToDelete} onOpenChange={(open) => !open && setStudentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the student 
              <span className="font-bold"> {studentToDelete?.fullName} </span> 
              and all of their associated payment history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStudentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Student
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  );
}
