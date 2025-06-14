
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


export default function SeatsPage() {
  const { currentLibraryId, currentLibraryName, loading: authLoading, isSuperAdmin, allLibraries, isManager } = useAuth();
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
    
    if (isSuperAdmin || currentLibraryId) {
      setLoadingData(true);
      try {
        const seatData = await getSeats(currentLibraryId); 
        setAllSeats(seatData);
        
        if (currentLibraryId) { // Only fetch students for current context if assigning/editing
            const studentData = await getStudents(currentLibraryId);
            setStudents(studentData.filter(s => s.status !== 'inactive'));
        } else {
            setStudents([]); // SA in all-libs view, student list for assignment not loaded by default
        }
      } catch (error) {
          toast({ title: "Error", description: `Failed to fetch seat or student data for ${currentLibraryName || 'libraries'}. ${(error as Error).message}`, variant: "destructive" });
          setAllSeats([]);
          setStudents([]);
      } finally {
          setLoadingData(false);
      }
    } else { 
        setLoadingData(false);
        setAllSeats([]);
        setStudents([]);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [currentLibraryId, authLoading, isSuperAdmin, currentLibraryName]); 

  const seatsByFloorAndLibrary = useMemo(() => {
    return allSeats.reduce((acc, seat) => {
      const libName = seat.libraryName || 'Unknown Library';
      const floor = seat.floor || 'Uncategorized';
      const key = isSuperAdmin && !currentLibraryId ? `${libName} - ${floor}` : floor;

      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(seat);
      return acc;
    }, {} as Record<string, Seat[]>);
  }, [allSeats, isSuperAdmin, currentLibraryId]);

  const openAssignDialog = async (seat: Seat) => {
    const targetLibraryId = isSuperAdmin && !currentLibraryId ? seat.libraryId : currentLibraryId;
    if (!targetLibraryId) {
        toast({ title: "Action Disabled", description: "Please select a specific library context (View As Manager) to assign seats.", variant: "destructive" });
        return;
    }
    // Fetch students for the seat's actual library if SA is in global view
    if (isSuperAdmin && !currentLibraryId && seat.libraryId) {
      setLoadingData(true);
      try {
        const studentData = await getStudents(seat.libraryId);
        setStudents(studentData.filter(s => s.status !== 'inactive'));
      } catch (error) {
        toast({ title: "Error", description: `Could not load students for ${seat.libraryName}.`, variant: "destructive" });
        setStudents([]);
      } finally {
        setLoadingData(false);
      }
    }
    setSelectedSeatForAssignment({...seat, libraryId: targetLibraryId}); // Ensure seat object has libraryId for context
    setSelectedStudentIdForAssignment(seat.studentId || undefined);
    setIsAssignDialogOpen(true);
  };
  
  const handleAssignSeat = async () => {
    const targetLibId = selectedSeatForAssignment?.libraryId || currentLibraryId;
    if (!targetLibId || !selectedSeatForAssignment || !selectedStudentIdForAssignment) {
      toast({ title: "Error", description: "Please select a seat, a student, and ensure a library context.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await assignSeatAction(targetLibId, selectedStudentIdForAssignment, selectedSeatForAssignment.id);
      toast({ title: "Success", description: `Seat ${selectedSeatForAssignment.seatNumber} assigned.` });
      await fetchAllData();
      setIsAssignDialogOpen(false);
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message || `Failed to assign seat.`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleUnassignSeat = async () => {
    const targetLibId = selectedSeatForAssignment?.libraryId || currentLibraryId;
    if (!targetLibId || !selectedSeatForAssignment || !selectedSeatForAssignment.studentId) {
      toast({ title: "Error", description: "This seat is already vacant or no library selected.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await unassignSeatAction(targetLibId, selectedSeatForAssignment.id);
      toast({ title: "Success", description: `Seat ${selectedSeatForAssignment.seatNumber} is now empty.` });
      await fetchAllData();
      setIsAssignDialogOpen(false);
    } catch (error) {
        toast({ title: "Error", description: (error as Error).message || `Failed to make seat empty.`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddSeatDialog = () => {
    if (isManager && !currentLibraryId) {
      toast({ title: "Action Disabled", description: "Your manager account is not assigned to a library.", variant: "destructive" });
      return;
    }
    if (isSuperAdmin && allLibraries.length === 0) {
      toast({ title: "Cannot Add Seat", description: "Superadmin must create a library before adding seats.", variant: "destructive" });
      router.push('/manage-libraries');
      return;
    }
    setEditingSeat(null);
    setSeatFormDialogMode('add');
    setIsSeatFormOpen(true);
  };

  const openEditSeatDialog = (seat: Seat) => {
    const targetLibraryId = isSuperAdmin && !currentLibraryId ? seat.libraryId : currentLibraryId;
     if (!targetLibraryId) {
        toast({ title: "Action Disabled", description: "Please select a specific library context (View As Manager) to edit seats.", variant: "destructive" });
        return;
    }
    setEditingSeat({...seat, libraryId: targetLibraryId}); // Ensure seat object has libraryId for context
    setSeatFormDialogMode('edit');
    setIsSeatFormOpen(true);
  };

  const handleSeatFormSubmit = async (values: SeatFormValues) => {
    const targetLibId = (isSuperAdmin && !currentLibraryId && values.selectedLibraryId) ? values.selectedLibraryId : editingSeat?.libraryId || currentLibraryId; 
    
    if (!targetLibId) {
        toast({ title: "Error", description: "A library must be selected or active to save the seat.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    setIsSubmitting(true);
    try {
      const seatDetails = { seatNumber: values.seatNumber, floor: values.floor };
      if (seatFormDialogMode === 'edit' && editingSeat) {
        await updateSeatDetails(targetLibId, editingSeat.id, seatDetails);
        toast({ title: "Success", description: `Seat updated successfully in ${editingSeat.libraryName || targetLibId}.` });
      } else {
        await addSeat(targetLibId, seatDetails); 
        const libName = allLibraries.find(l => l.id === targetLibId)?.name || targetLibId;
        toast({ title: "Success", description: `Seat added successfully to ${libName}.` });
      }
      await fetchAllData();
      setIsSeatFormOpen(false);
      setEditingSeat(null);
    } catch (error) {
      const libName = allLibraries.find(l => l.id === targetLibId)?.name || targetLibId;
      toast({ title: "Error", description: (error as Error).message || `Failed to save seat in ${libName}.`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const confirmDeleteSeat = (seat: Seat) => {
    const targetLibraryId = isSuperAdmin && !currentLibraryId ? seat.libraryId : currentLibraryId;
    if (!targetLibraryId) {
        toast({ title: "Action Disabled", description: "Please select a specific library context (View As Manager) to delete seats.", variant: "destructive" });
        return;
    }
    setSeatToDelete({...seat, libraryId: targetLibraryId});
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteSeat = async () => {
    if (!seatToDelete || !seatToDelete.libraryId) return;
    setIsSubmitting(true);
    try {
      await deleteSeatAction(seatToDelete.libraryId, seatToDelete.id);
      toast({ title: "Success", description: `Seat ${seatToDelete.seatNumber} (${seatToDelete.floor}) deleted from ${seatToDelete.libraryName || seatToDelete.libraryId}.` });
      await fetchAllData();
      setIsDeleteConfirmOpen(false);
      setSeatToDelete(null);
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message || `Failed to delete seat from ${seatToDelete.libraryName || seatToDelete.libraryId}.`, variant: "destructive" });
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

  if (isManager && !currentLibraryId && !authLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-full text-center p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
         <Card className="w-full max-w-md mt-4 shadow-lg">
          <CardHeader><CardTitle className="text-primary">No Library Selected</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please ensure your manager account is correctly set up with a library.</p>
            <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const studentsForAssignmentDropdown = students.filter(s => !s.seatId || s.id === selectedSeatForAssignment?.studentId);
  const defaultAccordionOpenKeys = Object.keys(seatsByFloorAndLibrary).length > 0 ? [Object.keys(seatsByFloorAndLibrary)[0]] : [];
  const pageTitle = isSuperAdmin && !currentLibraryId ? "All Seats (All Libraries)" : `Seat Setup (${currentLibraryName || 'Selected Library'})`;
  
  const canManageSelectedSeatActions = (seat: Seat) => {
      return isManager || (isSuperAdmin && (!!currentLibraryId || !!seat.libraryId));
  };
  const canAddSeatOverall = (isManager && !!currentLibraryId) || (isSuperAdmin && allLibraries.length > 0);
  const addSeatButtonTitle = !canAddSeatOverall ? 
    (isSuperAdmin && allLibraries.length === 0 ? "Create a library first" : "Select a library context or ensure assignment") 
    : "Add new seat";


  return (
    <TooltipProvider>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-headline font-bold text-primary">{pageTitle}</h1>
            {currentLibraryName && <p className="text-md text-muted-foreground flex items-center"><Library className="h-4 w-4 mr-2 text-accent" />Managing seats for: <span className="font-semibold ml-1">{currentLibraryName}</span></p>}
            {isSuperAdmin && !currentLibraryId && <p className="text-md text-muted-foreground">Displaying seats from all libraries. Select a library via "View As Manager" to manage specific seats, or add a seat to a chosen library.</p>}
        </div>
        <div className="flex items-center gap-4">
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="w-full sm:w-auto">
                        <Button onClick={openAddSeatDialog} disabled={!canAddSeatOverall} aria-disabled={!canAddSeatOverall}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add New Seat
                        </Button>
                    </div>
                </TooltipTrigger>
                {!canAddSeatOverall && <TooltipContent><p>{addSeatButtonTitle}</p></TooltipContent>}
            </Tooltip>
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

      { (isSuperAdmin && allLibraries.length === 0 && !currentLibraryId) ? (
         <Card className="shadow-xl">
            <CardHeader>
                <CardTitle>No Libraries Exist</CardTitle>
                <CardDescription>Superadmin must create a library before managing seats.</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
                 <Library className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Please go to "Manage Libraries" to create your first library.</p>
                <Button className="mt-4" onClick={() => router.push('/manage-libraries')}>
                     Manage Libraries
                </Button>
            </CardContent>
        </Card>
      ) : Object.keys(seatsByFloorAndLibrary).length > 0 ? (
        <Accordion type="multiple" defaultValue={defaultAccordionOpenKeys} className="w-full">
          {Object.entries(seatsByFloorAndLibrary).map(([floorOrLibFloor, floorSeats]) => (
            <AccordionItem value={floorOrLibFloor} key={floorOrLibFloor}>
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                {floorOrLibFloor} <span className="text-sm font-normal text-muted-foreground ml-2">({floorSeats.length} seats)</span>
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
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={!canManageSelectedSeatActions(seat)} title={!canManageSelectedSeatActions(seat) ? "Select specific library context" : "Actions"}>
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
                       {isSuperAdmin && !currentLibraryId && seat.libraryName && (
                        <p className="text-xs text-muted-foreground mt-1 self-start pl-1">Lib: {seat.libraryName}</p>
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
                <CardTitle>No Seats Found {currentLibraryName ? `for ${currentLibraryName}` : (isSuperAdmin ? "across all libraries" : "")}</CardTitle>
                <CardDescription>Start by adding floors and seats {currentLibraryName ? `for this library` : (isSuperAdmin && allLibraries.length > 0 ? "to a selected library" : "")}.</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
                 <Armchair className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No seats have been configured yet {currentLibraryName ? `for ${currentLibraryName}` : (isSuperAdmin ? "in any library" : "")}.</p>
                {canAddSeatOverall && (
                  <Button className="mt-4" onClick={openAddSeatDialog}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add First Seat
                  </Button>
                )}
            </CardContent>
        </Card>
      )}
      
      <Dialog open={isAssignDialogOpen} onOpenChange={(open) => { setIsAssignDialogOpen(open); if (!open) { setSelectedSeatForAssignment(null); if (isSuperAdmin && !currentLibraryId) setStudents([]);} }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Seat: {selectedSeatForAssignment?.seatNumber} ({selectedSeatForAssignment?.floor}) in {selectedSeatForAssignment?.libraryName || currentLibraryName || 'Library'}</DialogTitle>
            <DialogDescription>
              {selectedSeatForAssignment?.isOccupied 
                ? `This seat is taken by ${selectedSeatForAssignment.studentName}. You can assign it to someone else or make it empty.`
                : `Choose a student for this seat.`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <label htmlFor="student-select" className="block text-sm font-medium text-foreground">
              Select Student
            </label>
            <Select value={selectedStudentIdForAssignment} onValueChange={setSelectedStudentIdForAssignment} disabled={students.length === 0 && !loadingData}>
              <SelectTrigger id="student-select">
                <SelectValue placeholder={loadingData ? "Loading students..." : (students.length === 0 ? "No students available" : "Select a student to assign") } />
              </SelectTrigger>
              <SelectContent>
                {studentsForAssignmentDropdown.map(student => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.fullName} {student.seatId && student.seatId !== selectedSeatForAssignment?.id ? `(Currently in another seat)` : ''}
                  </SelectItem>
                ))}
                 {students.length === 0 && !loadingData && <p className="p-2 text-xs text-muted-foreground">No eligible students in {selectedSeatForAssignment?.libraryName || currentLibraryName || 'this library'}.</p>}
              </SelectContent>
            </Select>
             
          </div>

          <DialogFooter className="sm:justify-between items-center">
            {selectedSeatForAssignment?.isOccupied ? (
              <Button variant="destructive" onClick={handleUnassignSeat} disabled={isSubmitting}>
                {isSubmitting && selectedSeatForAssignment?.studentId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Make Seat Empty
              </Button>
            ) : <div/> }
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

      <Dialog open={isSeatFormOpen} onOpenChange={(open) => {if(!open) setEditingSeat(null); setIsSeatFormOpen(open);}}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>
                    {seatFormDialogMode === 'edit' ? 
                        (editingSeat ? `Edit Seat: ${editingSeat.seatNumber} (${editingSeat.floor})` : "Edit Seat") : 
                        "Add New Seat"}
                     {` ${seatFormDialogMode === 'edit' && editingSeat?.libraryName ? `in ${editingSeat.libraryName}` : (currentLibraryName ? `to ${currentLibraryName}` : '') }`}
                </DialogTitle>
                <DialogDescription>
                    {seatFormDialogMode === 'edit' ? 
                        `Modify the details of this seat.` : 
                        `Add a new seat. ${isSuperAdmin && !currentLibraryId ? "Select the target library." : ""}`}
                </DialogDescription>
            </DialogHeader>
          <SeatForm 
            initialData={editingSeat ? { seatNumber: editingSeat.seatNumber, floor: editingSeat.floor } : undefined}
            onSubmit={handleSeatFormSubmit}
            isSubmitting={isSubmitting}
            onCancel={() => {setIsSeatFormOpen(false); setEditingSeat(null);}}
            dialogMode={seatFormDialogMode}
            renderHeader={false}
            allLibraries={allLibraries}
            isSuperAdminGlobalView={isSuperAdmin && !currentLibraryId}
          />
        </DialogContent>
      </Dialog>

        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete seat 
                    <span className="font-semibold"> {seatToDelete?.seatNumber} ({seatToDelete?.floor})</span> from {seatToDelete?.libraryName || currentLibraryName || 'the library'}.
                    {seatToDelete?.isOccupied && " The assigned student will also be unassigned."}
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSeatToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSeat} disabled={isSubmitting || !seatToDelete?.libraryId} className="bg-destructive hover:bg-destructive/90">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Delete
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
    </TooltipProvider>
  );
}
