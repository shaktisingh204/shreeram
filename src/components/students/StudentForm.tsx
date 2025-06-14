
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
import type { Student, Seat, PaymentType } from "@/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { getSeats, getPaymentTypes } from "@/lib/data";
import Image from "next/image";

const NONE_SELECT_VALUE = "__NONE__";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const studentFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }).max(100),
  aadhaarNumber: z.string().optional().or(z.literal('')).refine(val => val === '' || val === undefined || /^\d{12}$/.test(val), {
    message: "Aadhaar Number must be 12 digits if provided.",
  }),
  mobileNumber: z.string().optional().or(z.literal('')).refine(val => val === '' || val === undefined || /^\d{10}$/.test(val), {
    message: "Mobile number must be 10 digits if provided.",
  }),
  fatherName: z.string().max(100).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
  seatId: z.string(),
  status: z.enum(["enrolled", "owing", "inactive"]),
  amountPaidNow: z.coerce.number().min(0, { message: "Amount Paid Now cannot be negative." }),
  enrollmentDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }),
  paymentTypeId: z.string(),
  photoUrl: z.string().url({ message: "Invalid URL for photo." }).optional().or(z.literal('')),
  idProofUrl: z.string().url({ message: "Invalid URL for ID proof." }).optional().or(z.literal('')),
  photoUpload: z.instanceof(FileList).optional()
    .refine(files => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE, `Max photo size is 5MB.`)
    .refine(files => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files[0].type), "Only .jpg, .jpeg, .png and .webp formats are supported."),
  idProofUpload: z.instanceof(FileList).optional()
    .refine(files => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE, `Max ID proof size is 5MB.`),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;

export interface StudentSubmitValues {
  fullName: string;
  aadhaarNumber?: string;
  mobileNumber?: string;
  fatherName?: string;
  address?: string;
  notes?: string;
  seatId?: string;
  status: 'enrolled' | 'owing' | 'inactive';
  amountPaidNow: number; 
  feesDue?: number; 
  enrollmentDate: string;
  paymentTypeId?: string;
  photo?: File | string;
  idProof?: File | string;
}

interface StudentFormProps {
  initialData?: Student;
  onSubmit: (values: StudentSubmitValues) => Promise<void>;
  isSubmitting: boolean;
  currentLibraryId: string | null;
}

export function StudentForm({ initialData, onSubmit, isSubmitting, currentLibraryId }: StudentFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [availableSeats, setAvailableSeats] = useState<Seat[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [loadingDropdownData, setLoadingDropdownData] = useState(true);
  
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.photoUrl || null);
  const [idProofFileName, setIdProofFileName] = useState<string | null>(initialData?.idProofUrl ? "Existing ID Proof" : null);

  const libraryIdForDropdowns = currentLibraryId;

  useEffect(() => {
    async function fetchDataForDropdowns() {
      if (!libraryIdForDropdowns) {
        setLoadingDropdownData(false);
        setAvailableSeats([]);
        setPaymentTypes([]);
        if (initialData) { 
             toast({ title: "Error", description: "Library context not available for fetching form options.", variant: "destructive"});
        }
        return;
      }
      setLoadingDropdownData(true);
      try {
        const seatsData = await getSeats(libraryIdForDropdowns);
        const currentStudentSeatId = initialData?.seatId;
        setAvailableSeats(seatsData.filter(seat => !seat.isOccupied || seat.id === currentStudentSeatId));
        
        const plans = await getPaymentTypes(libraryIdForDropdowns);
        setPaymentTypes(plans);
      } catch (error) {
        console.error("Error fetching seats/payment types for student form:", error);
        toast({ title: "Form Error", description: `Could not load seat or payment type options for the selected library. ${(error as Error).message}`, variant: "destructive"});
        setAvailableSeats([]);
        setPaymentTypes([]);
      } finally {
        setLoadingDropdownData(false);
      }
    }
    fetchDataForDropdowns();
  }, [initialData, libraryIdForDropdowns, toast]);


  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: initialData ? {
      ...initialData,
      aadhaarNumber: initialData.aadhaarNumber || "",
      mobileNumber: initialData.mobileNumber || "",
      fatherName: initialData.fatherName || "",
      address: initialData.address || "",
      amountPaidNow: 0, 
      enrollmentDate: initialData.enrollmentDate || new Date().toISOString().split('T')[0],
      seatId: initialData.seatId || NONE_SELECT_VALUE,
      paymentTypeId: initialData.paymentTypeId || NONE_SELECT_VALUE,
      photoUrl: initialData.photoUrl || "",
      idProofUrl: initialData.idProofUrl || "",
      notes: initialData.notes || "",
      photoUpload: undefined,
      idProofUpload: undefined,
    } : {
      fullName: "",
      aadhaarNumber: "",
      mobileNumber: "",
      fatherName: "",
      address: "",
      photoUrl: "",
      idProofUrl: "",
      notes: "",
      seatId: NONE_SELECT_VALUE,
      status: "enrolled",
      amountPaidNow: 0,
      enrollmentDate: new Date().toISOString().split('T')[0],
      paymentTypeId: NONE_SELECT_VALUE,
      photoUpload: undefined,
      idProofUpload: undefined,
    },
  });

  useEffect(() => {
    if (!initialData && libraryIdForDropdowns) { 
        form.resetField("seatId", { defaultValue: NONE_SELECT_VALUE });
        form.resetField("paymentTypeId", { defaultValue: NONE_SELECT_VALUE });
    }
  }, [libraryIdForDropdowns, initialData, form]);


  const watchedPhotoUpload = form.watch('photoUpload');
  const watchedIdProofUpload = form.watch('idProofUpload');

  useEffect(() => {
    if (watchedPhotoUpload && watchedPhotoUpload.length > 0) {
      const file = watchedPhotoUpload[0];
      const objectUrl = URL.createObjectURL(file);
      setPhotoPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (initialData?.photoUrl) {
       setPhotoPreview(initialData.photoUrl);
    } else {
        setPhotoPreview(null);
    }
  }, [watchedPhotoUpload, initialData?.photoUrl]);

  useEffect(() => {
    if (watchedIdProofUpload && watchedIdProofUpload.length > 0) {
      setIdProofFileName(watchedIdProofUpload[0].name);
    } else if (initialData?.idProofUrl) {
      setIdProofFileName("Existing ID Proof");
    } else {
      setIdProofFileName(null);
    }
  }, [watchedIdProofUpload, initialData?.idProofUrl]);


  const handleFormSubmit = async (values: StudentFormValues) => {
    try {
      const { photoUpload, idProofUpload, photoUrl: initialPhotoUrl, idProofUrl: initialIdProofUrl, ...restOfFormValues } = values;
      
      const submissionData: StudentSubmitValues = {
        ...restOfFormValues,
        aadhaarNumber: values.aadhaarNumber || undefined,
        seatId: values.seatId === NONE_SELECT_VALUE ? undefined : values.seatId,
        paymentTypeId: values.paymentTypeId === NONE_SELECT_VALUE ? undefined : values.paymentTypeId,
        mobileNumber: values.mobileNumber || undefined,
        fatherName: values.fatherName || undefined,
        address: values.address || undefined,
        feesDue: initialData?.feesDue 
      };

      if (photoUpload && photoUpload.length > 0) {
        submissionData.photo = photoUpload[0];
      } else {
        submissionData.photo = initialPhotoUrl; 
      }

      if (idProofUpload && idProofUpload.length > 0) {
        submissionData.idProof = idProofUpload[0];
      } else {
        submissionData.idProof = initialIdProofUrl;
      }
      
      await onSubmit(submissionData);
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to save student data. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const isFormEffectivelyDisabled = isSubmitting || loadingDropdownData || !libraryIdForDropdowns;

  const formatFeesDueDisplay = (fees: number | undefined) => {
    if (fees === undefined || fees === null) return "N/A";
    if (fees < 0) return `INR ${(-fees).toFixed(2)} (Credit)`;
    if (fees > 0) return `INR ${fees.toFixed(2)} (Due)`;
    return "INR 0.00 (Cleared)";
  };


  return (
    <Card className="max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary">
          {initialData ? "Edit Student Details" : "Add New Student"}
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
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="aadhaarNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aadhaar Number (Optional)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="Enter 12-digit Aadhaar" {...field} value={field.value ?? ""} maxLength={12}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number (Optional)</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="Enter 10-digit mobile number" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="fatherName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Father's Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter father's name" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter student's address" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormItem>
                <FormLabel htmlFor="photoUpload">Student Photo (Optional)</FormLabel>
                <FormControl>
                  <Input id="photoUpload" type="file" accept="image/*" {...form.register("photoUpload")} className="pt-2"/>
                </FormControl>
                <FormDescription>Max 5MB. JPG, PNG, WebP accepted.</FormDescription>
                <FormMessage>{form.formState.errors.photoUpload?.message}</FormMessage>
                {photoPreview && (
                  <div className="mt-2">
                    <Image src={photoPreview} alt="Photo preview" width={100} height={100} className="rounded-md object-cover" data-ai-hint="student photo"/>
                  </div>
                )}
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="idProofUpload">ID Proof (Optional)</FormLabel>
                <FormControl>
                  <Input id="idProofUpload" type="file" {...form.register("idProofUpload")} className="pt-2"/>
                </FormControl>
                <FormDescription>Max 5MB. PDF or image accepted.</FormDescription>
                <FormMessage>{form.formState.errors.idProofUpload?.message}</FormMessage>
                {idProofFileName && (
                    <div className="mt-2 text-sm text-muted-foreground">
                        Selected: {idProofFileName}
                        {initialData?.idProofUrl && idProofFileName === "Existing ID Proof" && (
                             <a href={initialData.idProofUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:underline">
                                <Eye className="inline h-4 w-4 mr-1"/>View
                            </a>
                        )}
                    </div>
                )}
              </FormItem>
            </div>

             <FormField
              control={form.control}
              name="enrollmentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Joined On</FormLabel>
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
                    <FormLabel>Choose Seat (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={loadingDropdownData || !libraryIdForDropdowns}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingDropdownData ? "Loading seats..." : ( !libraryIdForDropdowns ? "Select library first" : "Choose a seat")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE_SELECT_VALUE}>No Seat Assigned</SelectItem>
                        {availableSeats.map(seat => (
                          <SelectItem key={seat.id} value={seat.id}>
                            {seat.seatNumber} ({seat.floor})
                          </SelectItem>
                        ))}
                        {availableSeats.length === 0 && !loadingDropdownData && libraryIdForDropdowns && (
                            <p className="p-2 text-xs text-muted-foreground">No available seats in selected library.</p>
                        )}
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
                        <SelectItem value="enrolled">Active (Paid/Credit)</SelectItem>
                        <SelectItem value="owing">Has Dues</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {initialData && (
              <FormItem>
                <FormLabel>Current Balance</FormLabel>
                <Input value={formatFeesDueDisplay(initialData.feesDue)} readOnly className="bg-muted/50 border-dashed" />
                <FormDescription>This is the student's current account balance before this transaction.</FormDescription>
              </FormItem>
            )}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="amountPaidNow"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Paid Now (INR)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Type (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={loadingDropdownData || !libraryIdForDropdowns}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingDropdownData ? "Loading types..." : (!libraryIdForDropdowns ? "Select library first" : "Choose a payment type")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE_SELECT_VALUE}>No Payment Type / Custom Payment</SelectItem>
                        {paymentTypes.map(plan => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} (INR{plan.amount}/{plan.frequency})
                          </SelectItem>
                        ))}
                        {paymentTypes.length === 0 && !loadingDropdownData && libraryIdForDropdowns && (
                            <p className="p-2 text-xs text-muted-foreground">No payment types in selected library.</p>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>If a payment type is selected, its amount will be charged for the current period.</FormDescription>
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
            <Button type="submit" disabled={isFormEffectivelyDisabled}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {initialData ? "Save Changes" : "Add Student"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
