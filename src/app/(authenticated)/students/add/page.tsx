
"use client";

import { useState, useEffect } from 'react';
import { StudentForm, type StudentSubmitValues } from '@/components/students/StudentForm';
import { addStudent } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { LibraryMetadata } from '@/types';

export default function AddStudentPage() {
  const { currentLibraryId, loading: authLoading, isSuperAdmin, allLibraries } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // For superadmin to select which library to add the student to
  const [targetLibraryId, setTargetLibraryId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isSuperAdmin && allLibraries && allLibraries.length > 0) {
      // Default to current context if valid, else first library
      const defaultLib = allLibraries.find(lib => lib.id === currentLibraryId) 
        ? currentLibraryId 
        : allLibraries[0].id;
      setTargetLibraryId(defaultLib);
    } else if (!isSuperAdmin && currentLibraryId) {
      setTargetLibraryId(currentLibraryId); // Manager's library
    }
  }, [isSuperAdmin, allLibraries, currentLibraryId]);


  const handleSubmit = async (values: StudentSubmitValues) => {
    const libraryForStudent = isSuperAdmin ? targetLibraryId : currentLibraryId;

    if (!libraryForStudent) {
      toast({ title: "Error", description: "No library selected or available for adding the student.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addStudent(libraryForStudent, values);
      toast({
        title: "Success",
        description: "New student added.",
      });
      router.push('/students');
      router.refresh(); 
    } catch (error) {
      console.error("Failed to add student:", error);
      toast({
        title: "Error",
        description: (error as Error).message || "Could not add new student. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentLibraryId && !isSuperAdmin) { // Manager without library context
    return (
      <div className="flex flex-col justify-center items-center h-full text-center p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-xl font-semibold">Cannot Add Student</p>
        <p className="text-muted-foreground">A library context is required to add a new student.</p>
         <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }
  
  if (isSuperAdmin && (!allLibraries || allLibraries.length === 0)) {
     return (
      <div className="flex flex-col justify-center items-center h-full text-center p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-xl font-semibold">No Libraries Available</p>
        <p className="text-muted-foreground">Superadmin must create a library before adding students.</p>
         <Button onClick={() => router.push('/manage-libraries')} className="mt-4">Manage Libraries</Button>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {isSuperAdmin && allLibraries && allLibraries.length > 0 && (
        <div className="max-w-2xl mx-auto mb-6 p-6 bg-muted/50 rounded-lg shadow">
          <Label htmlFor="target-library-select" className="text-lg font-semibold text-primary">Add Student To Library</Label>
          <Select value={targetLibraryId} onValueChange={setTargetLibraryId}>
            <SelectTrigger id="target-library-select" className="mt-2">
              <SelectValue placeholder="Select library to add student" />
            </SelectTrigger>
            <SelectContent>
              {allLibraries.map((lib: LibraryMetadata) => (
                <SelectItem key={lib.id} value={lib.id}>
                  {lib.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">Seats and Payment Types will be shown based on this selection.</p>
        </div>
      )}
      { (isSuperAdmin && targetLibraryId) || !isSuperAdmin ? (
          <StudentForm 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            currentLibraryId={currentLibraryId} // Global context for reference/fallbacks
            formModeTargetLibraryId={isSuperAdmin ? targetLibraryId : undefined} // Specific target library for student data & seats
          />
        ) : isSuperAdmin && (
            <div className="text-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground mt-2">Loading library selection...</p>
            </div>
        )
      }
    </div>
  );
}
