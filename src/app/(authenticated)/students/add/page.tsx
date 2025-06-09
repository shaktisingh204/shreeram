
"use client";

import { useState } from 'react';
import { StudentForm, type StudentSubmitValues } from '@/components/students/StudentForm'; // Updated import
import { addStudent } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function AddStudentPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (values: StudentSubmitValues) => { // Updated type
    setIsSubmitting(true);
    try {
      await addStudent(values); // addStudent now expects StudentSubmitValues compatible type
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

  return (
    <div className="space-y-6">
      <StudentForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}

    