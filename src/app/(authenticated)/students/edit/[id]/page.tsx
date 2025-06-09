
"use client";

import { useEffect, useState } from 'react';
import { StudentForm, type StudentSubmitValues } from '@/components/students/StudentForm';
import { getStudentById, updateStudent } from '@/lib/data';
import type { Student } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

interface EditStudentPageProps {
  params: { id: string };
}

export default function EditStudentPage({ params }: EditStudentPageProps) {
  const { currentLibraryId, loading: authLoading } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const studentId = params.id;

  useEffect(() => {
    if (studentId && currentLibraryId && !authLoading) {
      const fetchStudent = async () => {
        setLoadingData(true);
        try {
            const data = await getStudentById(currentLibraryId, studentId as string);
            if (data) {
            setStudent(data);
            } else {
            toast({
                title: "Error",
                description: "Student not found in the current library context.",
                variant: "destructive",
            });
            router.push('/students');
            }
        } catch (error) {
            toast({ title: "Error fetching student", description: (error as Error).message, variant: "destructive" });
            router.push('/students');
        } finally {
            setLoadingData(false);
        }
      };
      fetchStudent();
    } else if (!authLoading && !currentLibraryId) {
      // If auth is done but no library ID, no point in trying to load student
      setLoadingData(false);
    }
  }, [studentId, currentLibraryId, authLoading, toast, router]);

  const handleSubmit = async (values: StudentSubmitValues) => {
    if (!currentLibraryId) {
      toast({ title: "Error", description: "No library context selected.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await updateStudent(currentLibraryId, studentId as string, values);
      toast({
        title: "Success",
        description: "Student details saved.",
      });
      router.push('/students');
      router.refresh(); 
    } catch (error) {
       console.error("Failed to update student:", error);
      toast({
        title: "Error",
        description: (error as Error).message || "Could not save student details. Please try again.",
        variant: "destructive",
      });
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
        <p className="text-xl font-semibold">Cannot Edit Student</p>
        <p className="text-muted-foreground">A library context is required.</p>
         <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }

  if (!student) {
    return <div className="text-center py-12 p-4">Student not found. Or you may not have access in the current library context.</div>;
  }

  return (
    <div className="space-y-6">
      <StudentForm 
        initialData={student} 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting}
        currentLibraryId={currentLibraryId}
      />
    </div>
  );
}

