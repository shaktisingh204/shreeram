
"use client";

import { useState } from 'react';
import { StudentForm, type StudentFormValues } from '@/components/students/StudentForm';
import { addStudent } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function AddStudentPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (values: StudentFormValues) => {
    setIsSubmitting(true);
    try {
      await addStudent(values);
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
        description: "Could not add new student. Please try again.",
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
