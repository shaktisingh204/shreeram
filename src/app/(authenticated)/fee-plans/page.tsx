"use client";

import { useEffect, useState } from 'react';
import { getFeePlans, addFeePlan, updateFeePlan } from '@/lib/data';
import type { FeePlan } from '@/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Loader2, MoreHorizontal, ListChecks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FeePlanForm, type FeePlanFormValues } from './FeePlanForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';


export default function FeePlansPage() {
  const [feePlans, setFeePlans] = useState<FeePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<FeePlan | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    const data = await getFeePlans();
    setFeePlans(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddClick = () => {
    setEditingPlan(undefined);
    setIsFormOpen(true);
  };

  const handleEditClick = (plan: FeePlan) => {
    setEditingPlan(plan);
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (planId: string) => {
    if (confirm("Are you sure you want to delete this fee plan? This action cannot be undone.")) {
        // In a real app, call deleteFeePlan(planId)
        // For mock, filter out the plan
        setFeePlans(prevPlans => prevPlans.filter(p => p.id !== planId));
        toast({ title: "Success", description: "Fee plan deleted (mock)." });
        // await fetchData(); // if you have a real backend delete
    }
  };

  const handleFormSubmit = async (values: FeePlanFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingPlan) {
        await updateFeePlan(editingPlan.id, values);
        toast({ title: "Success", description: "Fee plan updated." });
      } else {
        await addFeePlan(values);
        toast({ title: "Success", description: "Fee plan added." });
      }
      await fetchData();
      setIsFormOpen(false);
      setEditingPlan(undefined);
    } catch (error) {
      toast({ title: "Error", description: "Failed to save fee plan.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline font-bold text-primary">Fee Plans</h1>
        <Button onClick={handleAddClick}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Fee Plan
        </Button>
      </div>
      
      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingPlan(undefined); }}>
        <DialogContent className="sm:max-w-[425px]">
            <FeePlanForm
                initialData={editingPlan}
                onSubmit={handleFormSubmit}
                isSubmitting={isSubmitting}
                onCancel={() => {setIsFormOpen(false); setEditingPlan(undefined);}}
            />
        </DialogContent>
      </Dialog>

      <Card className="shadow-xl">
        <CardHeader>
            <CardTitle>Existing Fee Plans</CardTitle>
            <CardDescription>Manage different fee structures for students.</CardDescription>
        </CardHeader>
        <CardContent>
            {feePlans.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {feePlans.map((plan) => (
                    <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>${plan.amount.toFixed(2)}</TableCell>
                    <TableCell className="capitalize">{plan.frequency}</TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(plan)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteClick(plan.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </div>
            ) : (
             <div className="text-center py-12">
                <ListChecks className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-xl font-semibold">No Fee Plans Found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Get started by adding a new fee plan.
                </p>
                 <Button className="mt-4" onClick={handleAddClick}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Fee Plan
                </Button>
            </div>
            )}
        </CardContent>
      </Card>

    </div>
  );
}
