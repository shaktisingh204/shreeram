
"use client";

import { useEffect, useState } from 'react';
import { StudentForm, type StudentSubmitValues } from '@/components/students/StudentForm'; // Updated import
import { getStudentById, updateStudent } from '@/lib/data';
import type { Student } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface EditStudentPageProps {
  params: { id: string };
}

export default function EditStudentPage({ params }: EditStudentPageProps) {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const studentId = params.id;

  useEffect(() => {
    if (studentId) {
      const fetchStudent = async () => {
        setLoading(true);
        const data = await getStudentById(studentId as string);
        if (data) {
          setStudent(data);
        } else {
          toast({
            title: "Error",
            description: "Student not found.",
            variant: "destructive",
          });
          router.push('/students');
        }
        setLoading(false);
      };
      fetchStudent();
    }
  }, [studentId, toast, router]);

  const handleSubmit = async (values: StudentSubmitValues) => { // Updated type
    setIsSubmitting(true);
    try {
      await updateStudent(studentId as string, values); // updateStudent now expects StudentSubmitValues compatible type
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return <div className="text-center py-12">Student not found.</div>;
  }

  return (
    <div className="space-y-6">
      <StudentForm initialData={student} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}

    