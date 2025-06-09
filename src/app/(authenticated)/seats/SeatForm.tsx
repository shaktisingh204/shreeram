
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
import type { Seat } from "@/types";

const seatFormSchema = z.object({
  seatNumber: z.string().min(1, { message: "Seat number is required." }).max(20, {message: "Seat number too long (max 20 chars)."}),
  floor: z.string().min(1, { message: "Floor is required." }).max(50, {message: "Floor name too long (max 50 chars)."}),
});

export type SeatFormValues = z.infer<typeof seatFormSchema>;

interface SeatFormProps {
  initialData?: Pick<Seat, 'seatNumber' | 'floor'>;
  onSubmit: (values: SeatFormValues) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
  dialogMode?: 'add' | 'edit';
  renderHeader?: boolean; // New prop
}

export function SeatForm({ initialData, onSubmit, isSubmitting, onCancel, dialogMode = 'add', renderHeader = true }: SeatFormProps) {
  const form = useForm<SeatFormValues>({
    resolver: zodResolver(seatFormSchema),
    defaultValues: initialData || {
      seatNumber: "",
      floor: "",
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
          <CardContent className="space-y-4 px-0 pt-2"> {/* Adjusted pt if header is hidden */}
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
