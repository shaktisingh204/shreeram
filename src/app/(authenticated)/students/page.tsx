
"use client";

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getStudents, getSeats } from '@/lib/data'; 
import type { Student, Seat } from '@/types'; 
import { PlusCircle, Search, Edit, Eye, Trash2, Loader2, MoreHorizontal, AlertTriangle, Users, Library } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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


export default function StudentsPage() {
  const { currentLibraryId, currentLibraryName, isSuperAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) {
        setLoadingData(true);
        return;
      }
      // Superadmin in "All Libraries" view (currentLibraryId is null) OR a manager with a specific libraryId
      if (isSuperAdmin || currentLibraryId) {
        setLoadingData(true);
        try {
          // Pass currentLibraryId (can be null for superadmin to fetch all)
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
      } else { // Manager without currentLibraryId (should not happen if context is set up)
        setLoadingData(false);
        setStudents([]);
        setSeats([]);
      }
    };
    fetchData();
  }, [currentLibraryId, authLoading, isSuperAdmin, currentLibraryName, toast]);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const nameMatch = student.fullName.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch = statusFilter === 'all' || student.status === statusFilter;
      return nameMatch && statusMatch;
    });
  }, [students, searchTerm, statusFilter]);

  const getStatusBadgeVariant = (status: Student['status']) => {
    switch (status) {
      case 'enrolled':
        return 'default'; 
      case 'owing':
        return 'destructive';
      case 'inactive':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  
  const getStatusBadgeText = (status: Student['status']) => {
    switch (status) {
      case 'enrolled':
        return 'Active'; 
      case 'owing':
        return 'Has Dues';
      case 'inactive':
        return 'Inactive';
      default:
        return status;
    }
  };


  const getStudentSeatDisplay = (studentSeatId?: string) => {
    if (!studentSeatId) return 'N/A';
    const seat = seats.find(s => s.id === studentSeatId);
    // For superadmin all-libraries view, seat.libraryName might be available if added in getSeats
    return seat ? `${seat.seatNumber} (${seat.floor}${seat.libraryName ? ` - ${seat.libraryName}` : ''})` : 'N/A';
  };

  if (authLoading || loadingData) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // For managers, if no currentLibraryId, show configuration issue.
  // Superadmins with currentLibraryId === null are in "All Libraries" view, which is valid.
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
  const canAddStudent = !!currentLibraryId; // Can only add if a specific library is selected (manager or SA impersonating)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-headline font-bold text-primary">{pageTitle}</h1>
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
              <SelectItem value="enrolled">Active</SelectItem>
              <SelectItem value="owing">Has Dues</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/students/add" passHref legacyBehavior>
            <Button className="w-full sm:w-auto" disabled={!canAddStudent} title={!canAddStudent ? "Select a specific library to add students" : "Add new student"}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Student
            </Button>
          </Link>
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
                <TableHead>Contact</TableHead>
                <TableHead>Seat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount to Pay</TableHead>
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
                  <TableCell>{student.contactDetails}</TableCell>
                  <TableCell>{getStudentSeatDisplay(student.seatId)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(student.status)} className="capitalize">
                      {getStatusBadgeText(student.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>INR{student.feesDue.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={!currentLibraryId && isSuperAdmin} title={!currentLibraryId && isSuperAdmin ? "Select a library to manage student" : "Actions"}>
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
                        <DropdownMenuItem className="text-destructive flex items-center" onClick={() => alert(`Delete student ${student.fullName}? (Not implemented)`)}>
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
          {!(searchTerm || statusFilter !== 'all') && canAddStudent && (
             <Link href="/students/add">
                <Button className="mt-4">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Student
                </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

