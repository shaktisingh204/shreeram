
"use client";

import { useEffect, useState, useMemo } from 'react';
import { getSeats, assignSeat as assignSeatAction, unassignSeat as unassignSeatAction, getStudents, addSeat, updateSeatDetails, deleteSeat as deleteSeatAction } from '@/lib/data';
import type { Seat, Student } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Armchair, UserX, UserCheck, Loader2, PlusCircle, Edit, Trash2, MoreHorizontal, AlertTriangle, Library } from 'lucide-react';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { SeatForm, type SeatFormValues } from './SeatForm';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';


export default function SeatsPage() {
  const { currentLibraryId, currentLibraryName, loading: authLoading } = useAuth();
  const router = useRouter();
  const [allSeats, setAllSeats] = useState<Seat[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const [selectedSeatForAssignment, setSelectedSeatForAssignment] = useState<Seat | null>(null);
  const [selectedStudentIdForAssignment, setSelectedStudentIdForAssignment] = useState<string | undefined>(undefined);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const [isSeatFormOpen, setIsSeatFormOpen] = useState(false);
  const [editingSeat, setEditingSeat] = useState<Seat | null>(null);
  const [seatFormDialogMode, setSeatFormDialogMode] = useState<'add' | 'edit'>('add');
  
  const [seatToDelete, setSeatToDelete] = useState<Seat | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false); 

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchAllData = async () => {
    if (authLoading) {
      setLoadingData(true);
      return;
    }
    if (!currentLibraryId) {
      setLoadingData(false);
      setAllSeats([]);
      setStudents([]);
      return;
    }
    setLoadingData(true);
    try {
      const seatData = await getSeats(currentLibraryId);
      const studentData = await getStudents(currentLibraryId);
      setAllSeats(seatData);
      setStudents(studentData.filter(s => s.status !== 'inactive'));
    } catch (error) {
        toast({ title: "Error", description: `Failed to fetch seat or student data for ${currentLibraryName || 'the current library'}. ${(error as Error).message}`, variant: "destructive" });
        setAllSeats([]);
        setStudents([]);
    } finally {
        setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [currentLibraryId, authLoading]); // Simplified dependencies

  const seatsByFloor = useMemo(() => {
    return allSeats.reduce((acc, seat) => {
      const floor = seat.floor || 'Uncategorized';
      if (!acc[floor]) {
        acc[floor] = [];
      }
      acc[floor].push(seat);
      return acc;
    }, {} as Record<string, Seat[]>);
  }, [allSeats]);

  const openAssignDialog = (seat: Seat) => {
    setSelectedSeatForAssignment(seat);
    setSelectedStudentIdForAssignment(seat.studentId || undefined);
    setIsAssignDialogOpen(true);
  };
  
  const handleAssignSeat = async () => {
    if (!currentLibraryId || !selectedSeatForAssignment || !selectedStudentIdForAssignment) {
      toast({ title: "Error", description: "Please select a seat and a student.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await assignSeatAction(currentLibraryId, selectedStudentIdForAssignment, selectedSeatForAssignment.id);
      toast({ title: "Success", description: `Seat ${selectedSeatForAssignment.seatNumber} (${selectedSeatForAssignment.floor}) assigned in ${currentLibraryName}.` });
      await fetchAllData();
      setIsAssignDialogOpen(false);
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message || `Failed to assign seat in ${currentLibraryName}.`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleUnassignSeat = async () => {
    if (!currentLibraryId || !selectedSeatForAssignment || !selectedSeatForAssignment.studentId) {
      toast({ title: "Error", description: "This seat is already vacant.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await unassignSeatAction(currentLibraryId, selectedSeatForAssignment.id);
      toast({ title: "Success", description: `Seat ${selectedSeatForAssignment.seatNumber} (${selectedSeatForAssignment.floor}) in ${currentLibraryName} is now empty.` });
      await fetchAllData();
      setIsAssignDialogOpen(false);
    } catch (error) {
        toast({ title: "Error", description: (error as Error).message || `Failed to make seat empty in ${currentLibraryName}.`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddSeatDialog = () => {
    setEditingSeat(null);
    setSeatFormDialogMode('add');
    setIsSeatFormOpen(true);
  };

  const openEditSeatDialog = (seat: Seat) => {
    setEditingSeat(seat);
    setSeatFormDialogMode('edit');
    setIsSeatFormOpen(true);
  };

  const handleSeatFormSubmit = async (values: SeatFormValues) => {
    if (!currentLibraryId) {
        toast({ title: "Error", description: "No library selected to save the seat.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    try {
      if (seatFormDialogMode === 'edit' && editingSeat) {
        await updateSeatDetails(currentLibraryId, editingSeat.id, values);
        toast({ title: "Success", description: `Seat updated successfully in ${currentLibraryName}.` });
      } else {
        await addSeat(currentLibraryId, values);
        toast({ title: "Success", description: `Seat added successfully to ${currentLibraryName}.` });
      }
      await fetchAllData();
      setIsSeatFormOpen(false);
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message || `Failed to save seat in ${currentLibraryName}.`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const confirmDeleteSeat = (seat: Seat) => {
    setSeatToDelete(seat);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteSeat = async () => {
    if (!currentLibraryId || !seatToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteSeatAction(currentLibraryId, seatToDelete.id);
      toast({ title: "Success", description: `Seat ${seatToDelete.seatNumber} (${seatToDelete.floor}) deleted from ${currentLibraryName}.` });
      await fetchAllData();
      setIsDeleteConfirmOpen(false);
      setSeatToDelete(null);
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message || `Failed to delete seat from ${currentLibraryName}.`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
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
        <p className="text-xl font-semibold">No Library Selected / User Misconfiguration</p>
        <p className="text-muted-foreground">Please ensure your user account is correctly set up with a library or select a library if you are a superadmin.</p>
        <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }


  const studentsForAssignmentDropdown = students.filter(s => !s.seatId || s.id === selectedSeatForAssignment?.studentId);
  const defaultAccordionOpen = Object.keys(seatsByFloor).length > 0 ? [Object.keys(seatsByFloor)[0]] : [];


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Seat Setup</h1>
            {currentLibraryName && <p className="text-md text-muted-foreground flex items-center"><Library className="h-4 w-4 mr-2 text-accent" />Managing seats for: <span className="font-semibold ml-1">{currentLibraryName}</span></p>}
        </div>
        <div className="flex items-center gap-4">
           <Button onClick={openAddSeatDialog}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Seat
          </Button>
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-green-500" />
            <span className="text-sm">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">Available</span>
          </div>
        </div>
      </div>

      {Object.keys(seatsByFloor).length > 0 ? (
        <Accordion type="multiple" defaultValue={defaultAccordionOpen} className="w-full">
          {Object.entries(seatsByFloor).map(([floor, floorSeats]) => (
            <AccordionItem value={floor} key={floor}>
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                {floor} <span className="text-sm font-normal text-muted-foreground ml-2">({floorSeats.length} seats)</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-1">
                  {floorSeats.map((seat) => (
                    <Card 
                        key={seat.id} 
                        className={`flex flex-col items-center justify-center p-3 transition-all duration-200 ease-in-out shadow-md hover:shadow-lg
                        ${seat.isOccupied ? 'bg-primary/10 border-primary' : 'bg-card border-border'}`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <div className="flex items-center">
                            <Armchair className={`h-6 w-6 mr-2 ${seat.isOccupied ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="text-lg font-medium">{seat.seatNumber}</span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openAssignDialog(seat)}>
                              {seat.isOccupied ? "Update Assignment" : "Assign Student"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEditSeatDialog(seat)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit Seat
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => confirmDeleteSeat(seat)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Seat
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {seat.isOccupied && seat.studentName ? (
                         <div className="text-center w-full">
                            <UserCheck className="h-5 w-5 text-green-500 mx-auto mb-1" />
                            <p className="text-xs text-green-600 font-medium truncate max-w-full px-1">{seat.studentName}</p>
                         </div>
                      ) : (
                        <div className="text-center w-full">
                            <UserX className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                            <p className="text-xs text-muted-foreground">Available</p>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <Card className="shadow-xl">
            <CardHeader>
                <CardTitle>No Seats Found for {currentLibraryName || "Current Library"}</CardTitle>
                <CardDescription>Start by adding floors and seats for this library.</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
                 <Armchair className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No seats have been configured yet for {currentLibraryName || "this library"}.</p>
                <Button className="mt-4" onClick={openAddSeatDialog}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add First Seat to {currentLibraryName || "Library"}
                </Button>
            </CardContent>
        </Card>
      )}
      
      {/* Assign/Manage Seat Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Seat: {selectedSeatForAssignment?.seatNumber} ({selectedSeatForAssignment?.floor})</DialogTitle>
            <DialogDescription>
              {selectedSeatForAssignment?.isOccupied 
                ? `This seat in ${currentLibraryName || 'the current library'} is taken by ${selectedSeatForAssignment.studentName}. You can assign it to someone else or make it empty.`
                : `Choose a student for this seat in ${currentLibraryName || 'the current library'}.`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <label htmlFor="student-select" className="block text-sm font-medium text-foreground">
              Select Student
            </label>
            <Select value={selectedStudentIdForAssignment} onValueChange={setSelectedStudentIdForAssignment}>
              <SelectTrigger id="student-select">
                <SelectValue placeholder="Select a student to assign" />
              </SelectTrigger>
              <SelectContent>
                {studentsForAssignmentDropdown.map(student => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.fullName} {student.seatId && student.seatId !== selectedSeatForAssignment?.id ? `(Currently in another seat)` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="sm:justify-between items-center">
            {selectedSeatForAssignment?.isOccupied ? (
              <Button variant="destructive" onClick={handleUnassignSeat} disabled={isSubmitting}>
                {isSubmitting && selectedSeatForAssignment?.studentId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Make Seat Empty
              </Button>
            ) : <div/> /* Placeholder for alignment */}
            <div className="flex gap-2 mt-2 sm:mt-0">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button 
                type="button" 
                onClick={handleAssignSeat} 
                disabled={isSubmitting || !selectedStudentIdForAssignment || selectedStudentIdForAssignment === selectedSeatForAssignment?.studentId}
              >
                {isSubmitting && selectedStudentIdForAssignment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} 
                {selectedSeatForAssignment?.isOccupied && selectedSeatForAssignment?.studentId !== selectedStudentIdForAssignment ? 'Change Student' : 'Confirm Assignment'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Seat Dialog */}
      <Dialog open={isSeatFormOpen} onOpenChange={(open) => {if(!open) setEditingSeat(null); setIsSeatFormOpen(open);}}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>
                    {seatFormDialogMode === 'edit' ? 
                        (editingSeat ? `Edit Seat: ${editingSeat.seatNumber} (${editingSeat.floor})` : "Edit Seat") : 
                        "Add New Seat"}
                     {` to ${currentLibraryName || 'Current Library'}`}
                </DialogTitle>
                <DialogDescription>
                    {seatFormDialogMode === 'edit' ? 
                        `Modify the details of this seat in ${currentLibraryName || 'the current library'}.` : 
                        `Add a new seat to ${currentLibraryName || 'the current library'}.`}
                </DialogDescription>
            </DialogHeader>
          <SeatForm 
            initialData={editingSeat ? { seatNumber: editingSeat.seatNumber, floor: editingSeat.floor } : undefined}
            onSubmit={handleSeatFormSubmit}
            isSubmitting={isSubmitting}
            onCancel={() => {setIsSeatFormOpen(false); setEditingSeat(null);}}
            dialogMode={seatFormDialogMode}
            renderHeader={false}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete seat 
                    <span className="font-semibold"> {seatToDelete?.seatNumber} ({seatToDelete?.floor})</span> from {currentLibraryName || 'the current library'}.
                    {seatToDelete?.isOccupied && " The assigned student will also be unassigned."}
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSeatToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSeat} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Delete
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}


    