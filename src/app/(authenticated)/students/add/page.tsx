
"use client";

import { useState, useEffect } from 'react';
import { StudentForm, type StudentSubmitValues } from '@/components/students/StudentForm';
import { addStudent } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2, AlertTriangle, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AddStudentPage() {
  const { currentLibraryId, currentLibraryName, loading: authLoading, isSuperAdmin, allLibraries } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (values: StudentSubmitValues) => {
    if (!currentLibraryId) {
      toast({ title: "Error", description: "No library selected or available for adding the student.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addStudent(currentLibraryId, values);
      toast({
        title: "Success",
        description: `New student added to ${currentLibraryName || 'the library'}.`,
      });
      router.push('/students');
      router.refresh(); 
    } catch (error) {
      console.error("Failed to add student:", error);
      toast({
        title: "Error",
        description: (error as Error).message || `Could not add new student to ${currentLibraryName || 'the library'}. Please try again.`,
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

  if (!currentLibraryId && !authLoading) { 
    let message = "A library context is required to add a new student.";
    let buttonAction = () => router.push('/dashboard');
    let buttonText = "Go to Dashboard";

    if (isSuperAdmin && (!allLibraries || allLibraries.length === 0)) {
      message = "Superadmin must create a library before adding students.";
      buttonAction = () => router.push('/manage-libraries');
      buttonText = "Manage Libraries";
    } else if (isSuperAdmin && allLibraries && allLibraries.length > 0) {
      message = "Superadmin, please select a library from the header dropdown to add a student.";
    }

    return (
      <div className="flex flex-col justify-center items-center h-full text-center p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <Card className="w-full max-w-md mt-4 shadow-lg">
          <CardHeader>
            <CardTitle className="text-primary">Cannot Add Student</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{message}</p>
            <Button onClick={buttonAction} className="mt-4">
              {buttonText}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="space-y-6">
       <div className="flex items-center space-x-2">
        <Library className="h-6 w-6 text-accent" />
        <p className="text-lg text-muted-foreground">
          Adding new student to: <span className="font-semibold text-primary">{currentLibraryName || "Selected Library"}</span>
        </p>
      </div>
      <StudentForm 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting} 
        currentLibraryId={currentLibraryId} 
      />
    </div>
  );
}
