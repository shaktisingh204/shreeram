
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
import type { Seat, LibraryMetadata } from "@/types";

const seatFormSchemaBase = z.object({
  seatNumber: z.string().min(1, { message: "Seat number is required." }).max(20, {message: "Seat number too long (max 20 chars)."}),
  floor: z.string().min(1, { message: "Floor is required." }).max(50, {message: "Floor name too long (max 50 chars)."}),
  selectedLibraryId: z.string().optional(),
});

// Conditional schema based on props, handled by form submission logic in parent or resolver
export type SeatFormValues = z.infer<typeof seatFormSchemaBase>;

interface SeatFormProps {
  initialData?: Pick<Seat, 'seatNumber' | 'floor'>;
  onSubmit: (values: SeatFormValues) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
  dialogMode?: 'add' | 'edit';
  renderHeader?: boolean;
  allLibraries?: LibraryMetadata[];
  isSuperAdminGlobalView?: boolean; // True if SA is in "All Libraries" view
}

export function SeatForm({ 
  initialData, 
  onSubmit, 
  isSubmitting, 
  onCancel, 
  dialogMode = 'add', 
  renderHeader = true,
  allLibraries = [],
  isSuperAdminGlobalView = false,
}: SeatFormProps) {

  const form = useForm<SeatFormValues>({
    resolver: zodResolver(
      isSuperAdminGlobalView && dialogMode === 'add'
        ? seatFormSchemaBase.extend({
            selectedLibraryId: z.string().min(1, { message: "Library selection is required." }),
          })
        : seatFormSchemaBase
    ),
    defaultValues: initialData ? {
      ...initialData,
      selectedLibraryId: undefined, // Not used for edit mode directly here
    } : {
      seatNumber: "",
      floor: "",
      selectedLibraryId: undefined,
    },
  });

  return (
    <Card className="w-full max-w-lg mx-auto shadow-none border-0">
      {renderHeader && (
        <CardHeader className="px-0 pt-0">
          <CardTitle className="font-headline text-xl text-primary">
            {dialogMode === 'edit' ? "Edit Seat" : "Add New Seat"}
          </CardTitle>
        </CardHeader>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4 px-0 pt-2">
            {isSuperAdminGlobalView && dialogMode === 'add' && (
              <FormField
                control={form.control}
                name="selectedLibraryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Library</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select library for this seat" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allLibraries.map(lib => (
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
            )}
            <FormField
              control={form.control}
              name="seatNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seat Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., A1 or S10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="floor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Floor</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Ground Floor or Floor 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end gap-2 px-0 pb-0">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {dialogMode === 'edit' ? "Save Changes" : "Add Seat"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
