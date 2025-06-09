"use client";

import { useEffect, useState } from 'react';
import { getSeats, assignSeat as assignSeatAction, getStudents } from '@/lib/data';
import type { Seat, Student } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Armchair, UserX, UserCheck, Loader2 } from 'lucide-react';
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

export default function SeatsPage() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>(undefined);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchSeatData = async () => {
    setLoading(true);
    const seatData = await getSeats();
    const studentData = await getStudents();
    setSeats(seatData);
    // Filter students who don't have a seat or are the current occupant of the selected seat
    setStudents(studentData.filter(s => s.status !== 'inactive'));
    setLoading(false);
  };

  useEffect(() => {
    fetchSeatData();
  }, []);

  const handleSeatClick = (seat: Seat) => {
    setSelectedSeat(seat);
    setSelectedStudentId(seat.studentId || undefined); // Pre-select current student if seat is occupied
    setIsAssignDialogOpen(true);
  };

  const handleAssignSeat = async () => {
    if (!selectedSeat || !selectedStudentId) {
      toast({ title: "Error", description: "Please select a seat and a student.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const success = await assignSeatAction(selectedStudentId, selectedSeat.seatNumber);
    if (success) {
      toast({ title: "Success", description: `Seat ${selectedSeat.seatNumber} assigned to student.` });
      await fetchSeatData(); // Re-fetch data to update UI
      setIsAssignDialogOpen(false);
    } else {
      toast({ title: "Error", description: "Failed to assign seat. It might be occupied or student invalid.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };
  
  const handleUnassignSeat = async () => {
    if (!selectedSeat || !selectedSeat.studentId) {
      toast({ title: "Error", description: "This seat is already vacant.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    // In a real app, you'd have an unassignSeatAction. Here we simulate by assigning to a non-existent student or clearing seat info.
    // For mock, let's find the student and update their seatNumber to null, and update the seat.
    const studentToUnassign = students.find(s => s.id === selectedSeat.studentId);
    if(studentToUnassign) {
      studentToUnassign.seatNumber = undefined; // or null
    }
    selectedSeat.isOccupied = false;
    selectedSeat.studentId = undefined;
    selectedSeat.studentName = undefined;
    
    // This would be part of a proper unassign API call.
    // For now, just updating local state then re-fetching will reflect in mock data.
    // await updateStudent(studentToUnassign.id, { seatNumber: null });
    // await updateSeat(selectedSeat.id, { isOccupied: false, studentId: null, studentName: null });

    toast({ title: "Success", description: `Seat ${selectedSeat.seatNumber} is now vacant.` });
    await fetchSeatData(); // Re-fetch data
    setIsAssignDialogOpen(false);
    setIsSubmitting(false);
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const studentsWithoutSeatOrCurrent = students.filter(s => !s.seatNumber || s.id === selectedSeat?.studentId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline font-bold text-primary">Seat Assignment</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-green-500" />
            <span className="text-sm">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-gray-400" />
            <span className="text-sm">Available</span>
          </div>
        </div>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Seating Grid</CardTitle>
          <CardDescription>Click on a seat to assign or view details. Grid represents 4 rows of 5 seats.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4 p-4 rounded-lg bg-muted/20 border border-dashed border-border">
            {seats.map((seat) => (
              <Button
                key={seat.id}
                variant="outline"
                className={`h-20 w-full flex flex-col items-center justify-center transition-all duration-200 ease-in-out transform hover:scale-105
                  ${seat.isOccupied ? 'bg-primary/10 border-primary text-primary hover:bg-primary/20' 
                                    : 'bg-background border-muted hover:bg-muted/50'}`}
                onClick={() => handleSeatClick(seat)}
              >
                <Armchair className={`h-8 w-8 mb-1 ${seat.isOccupied ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-sm font-medium">{seat.seatNumber}</span>
                {seat.isOccupied && seat.studentName && (
                  <span className="text-xs truncate max-w-full px-1">{seat.studentName}</span>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Seat: {selectedSeat?.seatNumber}</DialogTitle>
            <DialogDescription>
              {selectedSeat?.isOccupied 
                ? `Seat currently assigned to ${selectedSeat.studentName}. You can change assignment or unassign.`
                : `Assign this seat to a student.`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <label htmlFor="student-select" className="block text-sm font-medium text-foreground">
              Select Student
            </label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger id="student-select">
                <SelectValue placeholder="Select a student to assign" />
              </SelectTrigger>
              <SelectContent>
                {studentsWithoutSeatOrCurrent.map(student => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.fullName} {student.seatNumber && student.seatNumber !== selectedSeat?.seatNumber ? `(Seat: ${student.seatNumber})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="sm:justify-between">
            {selectedSeat?.isOccupied && (
              <Button variant="destructive" onClick={handleUnassignSeat} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Unassign Seat
              </Button>
            )}
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="button" onClick={handleAssignSeat} disabled={isSubmitting || !selectedStudentId}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} 
                {selectedSeat?.isOccupied ? 'Reassign Seat' : 'Assign Seat'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
