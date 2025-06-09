
"use client";

import { useEffect, useState } from 'react';
import { getPaymentTypes, addPaymentType, updatePaymentType } from '@/lib/data'; // Renamed functions
import type { PaymentType } from '@/types'; // Renamed type
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Loader2, MoreHorizontal, ListChecks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PaymentTypeForm, type PaymentTypeFormValues } from './FeePlanForm'; // Component name will be updated in its own file
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';


export default function PaymentTypesPage() { // Renamed component
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]); // Renamed state
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPaymentType, setEditingPaymentType] = useState<PaymentType | undefined>(undefined); // Renamed state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    const data = await getPaymentTypes(); // Renamed function
    setPaymentTypes(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddClick = () => {
    setEditingPaymentType(undefined);
    setIsFormOpen(true);
  };

  const handleEditClick = (plan: PaymentType) => {
    setEditingPaymentType(plan);
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (planId: string) => {
    if (confirm("Are you sure you want to delete this payment type? This action cannot be undone.")) {
        // In a real app, call deletePaymentType(planId)
        setPaymentTypes(prevPlans => prevPlans.filter(p => p.id !== planId));
        toast({ title: "Success", description: "Payment type deleted (mock)." });
    }
  };

  const handleFormSubmit = async (values: PaymentTypeFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingPaymentType) {
        await updatePaymentType(editingPaymentType.id, values); // Renamed function
        toast({ title: "Success", description: "Payment type updated." });
      } else {
        await addPaymentType(values); // Renamed function
        toast({ title: "Success", description: "Payment type added." });
      }
      await fetchData();
      setIsFormOpen(false);
      setEditingPaymentType(undefined);
    } catch (error) {
      toast({ title: "Error", description: "Failed to save payment type.", variant: "destructive" });
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
  
  const getFrequencyDisplay = (frequency: PaymentType['frequency']) => {
    switch (frequency) {
      case 'monthly': return 'Every Month';
      case 'quarterly': return 'Every 3 Months';
      case 'annually': return 'Every Year';
      default: return frequency;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline font-bold text-primary">Payment Types</h1>
        <Button onClick={handleAddClick}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Payment Type
        </Button>
      </div>
      
      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingPaymentType(undefined); }}>
        <DialogContent className="sm:max-w-[425px]">
            <PaymentTypeForm 
                initialData={editingPaymentType}
                onSubmit={handleFormSubmit}
                isSubmitting={isSubmitting}
                onCancel={() => {setIsFormOpen(false); setEditingPaymentType(undefined);}}
            />
        </DialogContent>
      </Dialog>

      <Card className="shadow-xl">
        <CardHeader>
            <CardTitle>Existing Payment Types</CardTitle>
            <CardDescription>Manage different payment options for students.</CardDescription>
        </CardHeader>
        <CardContent>
            {paymentTypes.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Type Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Cycle</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {paymentTypes.map((plan) => (
                    <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>₹{plan.amount.toFixed(2)}</TableCell>
                    <TableCell>{getFrequencyDisplay(plan.frequency)}</TableCell>
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
                <h3 className="mt-2 text-xl font-semibold">No Payment Types Found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Add a new payment type to start.
                </p>
                 <Button className="mt-4" onClick={handleAddClick}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Payment Type
                </Button>
            </div>
            )}
        </CardContent>
      </Card>

    </div>
  );
}
