
"use client";

import { useState } from 'react';
import { StudentForm, type StudentSubmitValues } from '@/components/students/StudentForm';
import { addStudent } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';


export default function AddStudentPage() {
  const { currentLibraryId, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (values: StudentSubmitValues) => {
    if (!currentLibraryId) {
      toast({ title: "Error", description: "No library context selected.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addStudent(currentLibraryId, values);
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

  if (!currentLibraryId) {
    return (
      <div className="flex flex-col justify-center items-center h-full text-center p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-xl font-semibold">Cannot Add Student</p>
        <p className="text-muted-foreground">A library context is required to add a new student.</p>
         <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StudentForm 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting} 
        currentLibraryId={currentLibraryId}
      />
    </div>
  );
}

