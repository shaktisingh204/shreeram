
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
import type { PaymentType } from "@/types"; 
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const paymentTypeFormSchema = z.object({ 
  name: z.string().min(2, { message: "Type name must be at least 2 characters." }).max(50),
  amount: z.coerce.number().min(0, { message: "Amount cannot be negative." }),
  frequency: z.enum(["monthly", "quarterly", "annually"]),
});

export type PaymentTypeFormValues = z.infer<typeof paymentTypeFormSchema>; 

interface PaymentTypeFormProps { 
  initialData?: PaymentType; 
  onSubmit: (values: PaymentTypeFormValues) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
  renderHeader?: boolean; // New prop
}

export function PaymentTypeForm({ initialData, onSubmit, isSubmitting, onCancel, renderHeader = true }: PaymentTypeFormProps) { 
  const form = useForm<PaymentTypeFormValues>({
    resolver: zodResolver(paymentTypeFormSchema),
    defaultValues: initialData || {
      name: "",
      amount: 0,
      frequency: "monthly",
    },
  });

  return (
    <Card className="w-full max-w-lg mx-auto shadow-lg">
        {renderHeader && (
            <CardHeader>
                <CardTitle className="font-headline text-xl text-primary">
                {initialData ? "Edit Payment Type" : "Add New Payment Type"}
                </CardTitle>
            </CardHeader>
        )}
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Type Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Standard Monthly" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Amount (INR)</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="100" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Payment Cycle</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select cycle" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="monthly">Every Month</SelectItem>
                        <SelectItem value="quarterly">Every 3 Months</SelectItem>
                        <SelectItem value="annually">Every Year</SelectItem>
                        </SelectContent>
                    </Select>
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
                {initialData ? "Save Changes" : "Add Type"}
                </Button>
            </CardFooter>
            </form>
        </Form>
    </Card>
  );
}
