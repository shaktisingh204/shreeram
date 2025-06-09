
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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const libraryFormSchema = z.object({
  name: z.string().min(2, { message: "Library name must be at least 2 characters." }).max(100),
});

export type LibraryFormValues = z.infer<typeof libraryFormSchema>;

interface LibraryFormProps {
  onSubmit: (values: LibraryFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export function LibraryForm({ onSubmit, isSubmitting }: LibraryFormProps) {
  const form = useForm<LibraryFormValues>({
    resolver: zodResolver(libraryFormSchema),
    defaultValues: {
      name: "",
    },
  });

  const handleSubmit = async (values: LibraryFormValues) => {
    await onSubmit(values);
    form.reset(); // Reset form after successful submission
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
            <CardTitle className="font-headline text-xl text-primary">
            Add New Library
            </CardTitle>
        </CardHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
            <CardContent className="space-y-4">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Library Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Main Branch, City Center Campus" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add Library
                </Button>
            </CardFooter>
            </form>
        </Form>
    </Card>
  );
}
