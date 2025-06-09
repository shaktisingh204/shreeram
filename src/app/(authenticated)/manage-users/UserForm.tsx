
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { LibraryMetadata, UserMetadata } from "@/types";
import { useEffect, useState } from "react";
import { getLibrariesMetadata } from "@/lib/data";

const userFormSchema = z.object({
  id: z.string().min(1, { message: "User ID (UID) from Firebase Auth is required." }),
  email: z.string().email({ message: "Valid email is required." }),
  displayName: z.string().min(2, { message: "Full name must be at least 2 characters." }).max(100),
  mobileNumber: z.string().optional().or(z.literal('')).refine(val => val === '' || val === undefined || /^\d{10}$/.test(val), {
    message: "Mobile number must be 10 digits if provided.",
  }),
  role: z.enum(["manager"]), // Superadmin is set manually or via different process
  assignedLibraryId: z.string().min(1, {message: "A library must be assigned to a manager."}),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  initialData?: UserMetadata; // For editing existing user metadata
  onSubmit: (values: UserFormValues) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
}

export function UserForm({ initialData, onSubmit, isSubmitting, onCancel }: UserFormProps) {
  const [libraries, setLibraries] = useState<LibraryMetadata[]>([]);

  useEffect(() => {
    async function fetchLibs() {
      const libs = await getLibrariesMetadata();
      setLibraries(libs);
    }
    fetchLibs();
  }, []);
  
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: initialData ? {
        id: initialData.id,
        email: initialData.email,
        displayName: initialData.displayName || "",
        mobileNumber: initialData.mobileNumber || "",
        role: "manager", // Form is for creating/editing managers
        assignedLibraryId: initialData.assignedLibraryId || "",
    } : {
      id: "",
      email: "",
      displayName: "",
      mobileNumber: "",
      role: "manager",
      assignedLibraryId: "",
    },
  });

  return (
    <Card className="w-full max-w-lg mx-auto shadow-lg">
        <CardHeader>
            <CardTitle className="font-headline text-xl text-primary">
            {initialData ? "Edit Manager Details" : "Add New Manager"}
            </CardTitle>
            {!initialData && <FormDescription>First, create the user in Firebase Authentication console, then enter their UID here.</FormDescription>}
        </CardHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
                <FormField
                control={form.control}
                name="id"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>User ID (Firebase UID)</FormLabel>
                    <FormControl>
                        <Input placeholder="Enter UID from Firebase Auth" {...field} disabled={!!initialData} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
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
                            <Input {...field} readOnly />
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
                {initialData ? "Save Changes" : "Add Manager"}
                </Button>
            </CardFooter>
            </form>
        </Form>
    </Card>
  );
}
