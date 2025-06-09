
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { LibraryMetadata, UserMetadata } from "@/types";
import { useEffect, useState } from "react";
import { getLibrariesMetadata } from "@/lib/data";

// Schema for editing existing user metadata (UID is present and not changed here)
const editUserFormSchema = z.object({
  id: z.string().min(1), // UID from Firebase Auth, present for editing
  email: z.string().email({ message: "Valid email is required." }),
  displayName: z.string().min(2, { message: "Full name must be at least 2 characters." }).max(100),
  mobileNumber: z.string().optional().or(z.literal('')).refine(val => val === '' || val === undefined || /^\d{10}$/.test(val), {
    message: "Mobile number must be 10 digits if provided.",
  }),
  role: z.enum(["manager"]), 
  assignedLibraryId: z.string().min(1, {message: "A library must be assigned to a manager."}),
  password: z.string().optional(), // Not used for edit, but part of unified form values
  confirmPassword: z.string().optional(), // Not used for edit
});

// Schema for adding a new manager (password is required)
const addUserFormSchema = z.object({
  id: z.string().optional(), // Not provided when adding
  email: z.string().email({ message: "Valid email is required." }),
  displayName: z.string().min(2, { message: "Full name must be at least 2 characters." }).max(100),
  mobileNumber: z.string().optional().or(z.literal('')).refine(val => val === '' || val === undefined || /^\d{10}$/.test(val), {
    message: "Mobile number must be 10 digits if provided.",
  }),
  role: z.enum(["manager"]),
  assignedLibraryId: z.string().min(1, {message: "A library must be assigned to a manager."}),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Please confirm the password." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // path of error
});


export type UserFormValues = z.infer<typeof addUserFormSchema>; // Use the more comprehensive one for form state

interface UserFormProps {
  initialData?: UserMetadata; 
  onSubmit: (values: UserFormValues) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
  mode: 'add' | 'edit';
  renderHeader?: boolean; // New prop
}

export function UserForm({ initialData, onSubmit, isSubmitting, onCancel, mode, renderHeader = true }: UserFormProps) {
  const [libraries, setLibraries] = useState<LibraryMetadata[]>([]);

  useEffect(() => {
    async function fetchLibs() {
      const libs = await getLibrariesMetadata();
      setLibraries(libs);
    }
    fetchLibs();
  }, []);
  
  const form = useForm<UserFormValues>({
    resolver: zodResolver(mode === 'add' ? addUserFormSchema : editUserFormSchema),
    defaultValues: initialData ? {
        id: initialData.id,
        email: initialData.email,
        displayName: initialData.displayName || "",
        mobileNumber: initialData.mobileNumber || "",
        role: "manager", 
        assignedLibraryId: initialData.assignedLibraryId || "",
        password: "", // Not relevant for edit
        confirmPassword: "", // Not relevant for edit
    } : {
      id: "", // Will not be used for add
      email: "",
      displayName: "",
      mobileNumber: "",
      role: "manager",
      assignedLibraryId: "",
      password: "",
      confirmPassword: "",
    },
  });

  return (
    <Card className="w-full max-w-lg mx-auto shadow-lg">
        {renderHeader && (
          <CardHeader>
              <CardTitle className="font-headline text-xl text-primary">
              {mode === 'edit' ? "Edit Manager Details" : "Add New Manager"}
              </CardTitle>
              {mode === 'add' && <p className="text-sm text-muted-foreground pt-1">Create a new manager account and assign them to a library.</p>}
          </CardHeader>
        )}
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
                {mode === 'edit' && initialData?.id && (
                    <FormField
                    control={form.control}
                    name="id"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>User ID (Firebase UID)</FormLabel>
                        <FormControl>
                            <Input {...field} disabled />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                )}
                <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Manager's Email</FormLabel>
                    <FormControl>
                        <Input type="email" placeholder="manager@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                {mode === 'add' && (
                    <>
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Initial Password</FormLabel>
                                <FormControl>
                                <Input type="password" placeholder="Enter initial password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Confirm Initial Password</FormLabel>
                                <FormControl>
                                <Input type="password" placeholder="Confirm initial password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </>
                )}
                <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Manager's Full Name</FormLabel>
                    <FormControl>
                        <Input placeholder="Enter manager's full name" {...field} />
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
                    <FormLabel>Manager's Mobile (Optional)</FormLabel>
                    <FormControl>
                        <Input type="tel" placeholder="10-digit mobile" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                  control={form.control}
                  name="assignedLibraryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Library</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a library" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {libraries.map(lib => (
                            <SelectItem key={lib.id} value={lib.id}>
                              {lib.name}
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
                    name="role"
                    render={({ field }) => (
                        <FormItem className="hidden"> 
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                            <Input {...field} readOnly value="manager" />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {mode === 'edit' ? "Save Changes" : "Add Manager"}
                </Button>
            </CardFooter>
            </form>
        </Form>
    </Card>
  );
}
