
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AddStudentPage() {
  const { currentLibraryId, loading: authLoading, isSuperAdmin, allLibraries } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // For superadmin to select which library to add the student to
  const [targetLibraryId, setTargetLibraryId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isSuperAdmin && allLibraries && allLibraries.length > 0) {
      // Default to current context if valid and exists in allLibraries, else first library, else undefined
      const contextLibraryIsValid = allLibraries.find(lib => lib.id === currentLibraryId);
      const defaultLib = contextLibraryIsValid ? currentLibraryId : (allLibraries[0]?.id);
      setTargetLibraryId(defaultLib);
    } else if (!isSuperAdmin && currentLibraryId) {
      setTargetLibraryId(currentLibraryId); // Manager's library
    } else if (isSuperAdmin && allLibraries.length === 0) {
      setTargetLibraryId(undefined); // Superadmin but no libraries exist
    }
  }, [isSuperAdmin, allLibraries, currentLibraryId]);


  const handleSubmit = async (values: StudentSubmitValues) => {
    // The library for student is determined by targetLibraryId (which is set by superadmin selector or manager's context)
    if (!targetLibraryId) {
      toast({ title: "Error", description: "No library selected or available for adding the student.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addStudent(targetLibraryId, values);
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

  if (!currentLibraryId && !isSuperAdmin && !authLoading) { // Manager without library context
    return (
      <div className="flex flex-col justify-center items-center h-full text-center p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-xl font-semibold">Cannot Add Student</p>
        <p className="text-muted-foreground">A library context is required to add a new student.</p>
         <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }
  
  if (isSuperAdmin && (!allLibraries || allLibraries.length === 0) && !authLoading) {
     return (
      <div className="flex flex-col justify-center items-center h-full text-center p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <Card className="w-full max-w-md mt-4 shadow-lg">
          <CardHeader>
            <CardTitle className="text-primary">No Libraries Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Superadmin must create a library before adding students.</p>
            <Button onClick={() => router.push('/manage-libraries')} className="mt-4">
              Manage Libraries
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {isSuperAdmin && allLibraries && allLibraries.length > 0 && (
        <Card className="max-w-2xl mx-auto mb-6 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">Add Student To Library</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={targetLibraryId} onValueChange={setTargetLibraryId} disabled={!targetLibraryId && allLibraries.length === 0}>
              <SelectTrigger id="target-library-select" className="mt-1">
                <SelectValue placeholder={allLibraries.length > 0 ? "Select library to add student" : "No libraries available"} />
              </SelectTrigger>
              <SelectContent>
                {allLibraries.map((lib: LibraryMetadata) => (
                  <SelectItem key={lib.id} value={lib.id}>
                    {lib.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">Seats and Payment Types for the form below will be based on this selection.</p>
          </CardContent>
        </Card>
      )}
      { ( (isSuperAdmin && targetLibraryId) || (!isSuperAdmin && currentLibraryId) ) ? (
          <StudentForm 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            // currentLibraryId is the user's global context. StudentForm uses it for editing or manager's add mode.
            currentLibraryId={currentLibraryId} 
            // formModeTargetLibraryId is for superadmin add mode, telling StudentForm which library's seats/plans to show.
            formModeTargetLibraryId={isSuperAdmin ? targetLibraryId : undefined} 
            allLibraries={isSuperAdmin ? allLibraries : undefined} // Pass allLibraries for potential use in StudentForm if needed
          />
        ) : (isSuperAdmin && allLibraries.length > 0 && !targetLibraryId) && ( // Superadmin, has libraries, but targetLibraryId not set yet
            <div className="text-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground mt-2">Loading library selection or select a library above...</p>
            </div>
        )
      }
    </div>
  );
}
