"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Student, Seat, FeePlan } from "@/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getSeats, getFeePlans } from "@/lib/data";

const studentFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }).max(100),
  contactDetails: z.string().email({ message: "Invalid email address." }),
  photoUrl: z.string().url({ message: "Invalid URL for photo." }).optional().or(z.literal('')),
  idProofUrl: z.string().url({ message: "Invalid URL for ID proof." }).optional().or(z.literal('')),
  notes: z.string().max(500).optional(),
  seatId: z.string().optional().or(z.literal('')), // Changed from seatNumber to seatId
  status: z.enum(["enrolled", "owing", "inactive"]),
  feesDue: z.coerce.number().min(0, { message: "Fees due cannot be negative." }),
  enrollmentDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }),
  feePlanId: z.string().optional().or(z.literal('')),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;

interface StudentFormProps {
  initialData?: Student;
  onSubmit: (values: StudentFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export function StudentForm({ initialData, onSubmit, isSubmitting }: StudentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [availableSeats, setAvailableSeats] = useState<Seat[]>([]);
  const [feePlans, setFeePlans] = useState<FeePlan[]>([]);

  useEffect(() => {
    async function fetchData() {
      const seatsData = await getSeats();
      // Filter for available seats OR the student's current seat if editing
      const currentSeatId = initialData?.seatId;
      setAvailableSeats(seatsData.filter(seat => !seat.isOccupied || seat.id === currentSeatId));
      
      const plans = await getFeePlans();
      setFeePlans(plans);
    }
    fetchData();
  }, [initialData]);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: initialData ? {
      ...initialData,
      feesDue: initialData.feesDue || 0,
      enrollmentDate: initialData.enrollmentDate || new Date().toISOString().split('T')[0],
      seatId: initialData.seatId || "", // Ensure seatId is correctly mapped
      feePlanId: initialData.feePlanId || "",
    } : {
      fullName: "",
      contactDetails: "",
      photoUrl: "",
      idProofUrl: "",
      notes: "",
      seatId: "", // Default to empty string for no seat
      status: "enrolled",
      feesDue: 0,
      enrollmentDate: new Date().toISOString().split('T')[0],
      feePlanId: "",
    },
  });

  const handleFormSubmit = async (values: StudentFormValues) => {
    try {
      // Ensure empty string seatId is converted to undefined if your backend expects that for "no seat"
      const submissionValues = {
        ...values,
        seatId: values.seatId === "" ? undefined : values.seatId,
        feePlanId: values.feePlanId === "" ? undefined : values.feePlanId,
      };
      await onSubmit(submissionValues as StudentFormValues); // Cast if necessary after modification
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to save student data. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary">
          {initialData ? "Edit Student" : "Add New Student"}
        </CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter student's full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="student@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="photoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Photo URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/photo.jpg" {...field} value={field.value ?? ""} />
                  </FormControl>
                   <FormDescription>Link to student's photo. Use https://placehold.co for placeholders.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="idProofUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID Proof URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/id.pdf" {...field} value={field.value ?? ""} />
                  </FormControl>
                   <FormDescription>Link to student's ID proof. Use https://placehold.co for placeholders.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>
             <FormField
              control={form.control}
              name="enrollmentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enrollment Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="seatId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign Seat (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a seat" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">No Seat</SelectItem>
                        {availableSeats.map(seat => (
                          <SelectItem key={seat.id} value={seat.id}>
                            {seat.seatNumber} ({seat.floor})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="enrolled">Enrolled</SelectItem>
                        <SelectItem value="owing">Owing</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="feesDue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fees Due</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="feePlanId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fee Plan (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a fee plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">No Plan</SelectItem>
                        {feePlans.map(plan => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} (${plan.amount}/{plan.frequency})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any additional notes about the student..." {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {initialData ? "Save Changes" : "Add Student"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
