
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { generateReportAction } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const reportSchema = z.object({
  month: z.string().min(1, "Month is required."),
  year: z.string().length(4, "Year must be 4 digits.").regex(/^\d{4}$/, "Invalid year format."),
  expectedTotalFees: z.coerce.number().min(0, "Expected fees must be a positive number."),
  receivedTotalFees: z.coerce.number().min(0, "Received fees must be a positive number."),
  currency: z.string().default("INR"),
});

type ReportFormValues = z.infer<typeof reportSchema>;

const months = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => (currentYear - 5 + i).toString());


export function ReportGeneratorForm() {
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      month: months[new Date().getMonth()],
      year: new Date().getFullYear().toString(),
      expectedTotalFees: 0,
      receivedTotalFees: 0,
      currency: "INR",
    },
  });

  const onSubmit = async (data: ReportFormValues) => {
    setIsSubmitting(true);
    setGeneratedReport(null);
    try {
      const result = await generateReportAction(data);
      if (result.success && result.report) {
        setGeneratedReport(result.report);
        toast({ title: "Success", description: "Statement generated." });
      } else {
        setGeneratedReport(`Error: ${result.error || "Unknown error"}`);
        toast({ title: "Error", description: result.error || "Failed to generate statement.", variant: "destructive" });
      }
    } catch (error) {
      setGeneratedReport("Error: An unexpected error occurred.");
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-primary">Monthly Fee Statement</CardTitle>
          <CardDescription>Enter details for an AI-generated monthly fee statement.</CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="month">Month</Label>
                 <ControllerSelect
                    control={form.control}
                    name="month"
                    items={months.map(m => ({ value: m, label: m }))}
                    placeholder="Select month"
                  />
                {form.formState.errors.month && <p className="text-sm text-destructive mt-1">{form.formState.errors.month.message}</p>}
              </div>
              <div>
                <Label htmlFor="year">Year</Label>
                <ControllerSelect
                    control={form.control}
                    name="year"
                    items={years.map(y => ({ value: y, label: y }))}
                    placeholder="Select year"
                  />
                {form.formState.errors.year && <p className="text-sm text-destructive mt-1">{form.formState.errors.year.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                <Label htmlFor="expectedTotalFees">Total Expected Fees (₹)</Label>
                <Input id="expectedTotalFees" type="number" {...form.register("expectedTotalFees")} />
                {form.formState.errors.expectedTotalFees && <p className="text-sm text-destructive mt-1">{form.formState.errors.expectedTotalFees.message}</p>}
              </div>
              <div>
                <Label htmlFor="receivedTotalFees">Total Received Fees (₹)</Label>
                <Input id="receivedTotalFees" type="number" {...form.register("receivedTotalFees")} />
                {form.formState.errors.receivedTotalFees && <p className="text-sm text-destructive mt-1">{form.formState.errors.receivedTotalFees.message}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" {...form.register("currency")} defaultValue="INR" />
              {form.formState.errors.currency && <p className="text-sm text-destructive mt-1">{form.formState.errors.currency.message}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Generate Statement
            </Button>
          </CardFooter>
        </form>
      </Card>

      {generatedReport && (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary">Generated Statement</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea value={generatedReport} readOnly rows={15} className="font-mono text-sm bg-muted/30" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}


// Helper component for react-hook-form with ShadCN Select
import { Controller } from "react-hook-form";
interface ControllerSelectProps {
  control: any; // Control type from react-hook-form
  name: string;
  items: { value: string; label: string }[];
  placeholder?: string;
}

function ControllerSelect({ control, name, items, placeholder }: ControllerSelectProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}
