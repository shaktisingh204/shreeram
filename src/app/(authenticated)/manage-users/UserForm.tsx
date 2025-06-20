
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
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { LibraryMetadata, UserMetadata } from "@/types";
import { useEffect, useState } from "react";
import { getLibrariesMetadata } from "@/lib/data";

const baseUserSchema = z.object({
  email: z.string().email({ message: "Valid email is required." }),
  displayName: z.string().min(2, { message: "Full name must be at least 2 characters." }).max(100),
  mobileNumber: z.string().optional().or(z.literal('')).refine(val => val === '' || val === undefined || /^\d{10}$/.test(val), {
    message: "Mobile number must be 10 digits if provided.",
  }),
  role: z.enum(["manager"]),
  assignedLibraries: z.record(z.boolean()).refine(val => Object.values(val).some(v => v), {
    message: "At least one library must be assigned to a manager.",
    path: ["assignedLibraries"],
  }),
});

const editUserFormSchema = baseUserSchema.extend({
  id: z.string().min(1),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
});

const addUserFormSchema = baseUserSchema.extend({
  id: z.string().optional(),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Please confirm the password." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});


export type UserFormValues = z.infer<typeof addUserFormSchema>;

interface UserFormProps {
  initialData?: UserMetadata;
  onSubmit: (values: UserFormValues) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
  mode: 'add' | 'edit';
  renderHeader?: boolean;
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

  const getDefaultAssignedLibs = () => {
    const assigned: { [key: string]: boolean } = {};
    if (initialData?.assignedLibraries) {
        Object.keys(initialData.assignedLibraries).forEach(libId => {
            assigned[libId] = true;
        });
    }
    return assigned;
  };

  const form = useForm<UserFormValues>({
    resolver: zodResolver(mode === 'add' ? addUserFormSchema : editUserFormSchema),
    defaultValues: initialData ? {
        id: initialData.id,
        email: initialData.email,
        displayName: initialData.displayName || "",
        mobileNumber: initialData.mobileNumber || "",
        role: "manager",
        assignedLibraries: getDefaultAssignedLibs(),
        password: "",
        confirmPassword: "",
    } : {
      id: "",
      email: "",
      displayName: "",
      mobileNumber: "",
      role: "manager",
      assignedLibraries: {},
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
              {mode === 'add' && <p className="text-sm text-muted-foreground pt-1">Create a new manager account and assign them to one or more libraries.</p>}
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
                        <Input type="email" placeholder="manager@example.com" {...field} disabled={mode === 'edit'} />
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
                  name="assignedLibraries"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Assign to Libraries</FormLabel>
                        <FormDescription>
                          Select one or more libraries for this manager to access.
                        </FormDescription>
                      </div>
                      <div className="space-y-2">
                        {libraries.map((lib) => (
                          <FormField
                            key={lib.id}
                            control={form.control}
                            name={`assignedLibraries.${lib.id}`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {lib.name}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
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
