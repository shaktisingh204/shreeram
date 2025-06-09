
"use client";

import { useEffect, useState } from 'react';
import { getPaymentTypes, addPaymentType, updatePaymentType } from '@/lib/data';
import type { PaymentType } from '@/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Loader2, MoreHorizontal, ListChecks, AlertTriangle, Library } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PaymentTypeForm, type PaymentTypeFormValues } from './FeePlanForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';


export default function PaymentTypesPage() {
  const { currentLibraryId, currentLibraryName, loading: authLoading, isSuperAdmin, allLibraries } = useAuth();
  const router = useRouter();
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPaymentType, setEditingPaymentType] = useState<PaymentType | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    if (authLoading) {
      setLoadingData(true);
      return;
    }
    // Superadmin in "All Libraries" view (currentLibraryId is null) OR a manager with a specific libraryId
    if (isSuperAdmin || currentLibraryId) {
      setLoadingData(true);
      try {
          // Pass currentLibraryId (can be null for superadmin to fetch all)
          const data = await getPaymentTypes(currentLibraryId);
          setPaymentTypes(data);
      } catch (error) {
          toast({ title: "Error", description: `Failed to fetch payment types for ${currentLibraryName || 'libraries'}.`, variant: "destructive" });
          setPaymentTypes([]);
      } finally {
          setLoadingData(false);
      }
    } else { // Manager without libraryId
        setLoadingData(false);
        setPaymentTypes([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentLibraryId, authLoading, isSuperAdmin, currentLibraryName]);

  const handleAddClick = () => {
     if (!currentLibraryId) { // True for SA in All Libs view, or unassigned manager
       toast({ title: "Action Disabled", description: "Please select a specific library context (View As Manager or select from header) to add payment types.", variant: "destructive" });
      return;
    }
     if (isSuperAdmin && allLibraries.length === 0) { // SA, no libs created yet
      toast({ title: "Cannot Add Plan", description: "Superadmin must create a library before adding payment types.", variant: "destructive" });
      router.push('/manage-libraries');
      return;
    }
    setEditingPaymentType(undefined);
    setIsFormOpen(true);
  };

  const handleEditClick = (plan: PaymentType) => {
    if (!currentLibraryId && isSuperAdmin) {
        toast({ title: "Action Disabled", description: "Please select a specific library context (View As Manager) to edit payment types.", variant: "destructive" });
        return;
    }
    setEditingPaymentType(plan);
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (planId: string) => {
    if (!currentLibraryId && isSuperAdmin) { // Check if SA is in "All Libraries" view
        toast({ title: "Action Disabled", description: "Please select a specific library context (View As Manager) to delete payment types.", variant: "destructive" });
        return;
    }
    if (!currentLibraryId) return; // General check if no lib context

    if (confirm("Are you sure you want to delete this payment type? This action cannot be undone.")) {
        // In a real app, call deletePaymentType(currentLibraryId, planId)
        // For now, this is a mock delete.
        // await deletePaymentType(currentLibraryId, planId); // Uncomment when implemented
        setPaymentTypes(prevPlans => prevPlans.filter(p => p.id !== planId));
        toast({ title: "Success", description: `Payment type deleted (mock) from ${currentLibraryName || 'the library'}.` });
        // await fetchData(); // if delete is implemented in lib/data.ts
    }
  };

  const handleFormSubmit = async (values: PaymentTypeFormValues) => {
    const targetLibId = currentLibraryId; 
    if (!targetLibId) {
        toast({ title: "Error", description: "No specific library selected to save the payment type. Please select a library context.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    try {
      if (editingPaymentType) {
        await updatePaymentType(targetLibId, editingPaymentType.id, values);
        toast({ title: "Success", description: `Payment type updated in ${currentLibraryName || 'the library'}.` });
      } else {
        await addPaymentType(targetLibId, values);
        toast({ title: "Success", description: `Payment type added to ${currentLibraryName || 'the library'}.` });
      }
      await fetchData();
      setIsFormOpen(false);
      setEditingPaymentType(undefined);
    } catch (error) {
      toast({ title: "Error", description: `Failed to save payment type in ${currentLibraryName || 'the library'}.`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (authLoading || loadingData) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin && !currentLibraryId && !authLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-full text-center p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
         <Card className="w-full max-w-md mt-4 shadow-lg">
          <CardHeader><CardTitle className="text-primary">No Library Selected</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please ensure your manager account is correctly set up with a library.</p>
            <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const pageTitle = isSuperAdmin && !currentLibraryId ? "All Payment Types (All Libraries)" : `Payment Types (${currentLibraryName || 'Selected Library'})`;
  const canManagePlans = !!currentLibraryId; // Can only add/edit/delete if a specific library is selected

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
        <div>
            <h1 className="text-3xl font-headline font-bold text-primary">{pageTitle}</h1>
            {currentLibraryName && <p className="text-md text-muted-foreground flex items-center"><Library className="h-4 w-4 mr-2 text-accent" />Managing for: <span className="font-semibold ml-1">{currentLibraryName}</span></p>}
            {isSuperAdmin && !currentLibraryId && <p className="text-md text-muted-foreground">Displaying payment types from all libraries. Select a library via "View As Manager" to manage specific types.</p>}
        </div>
        <Button onClick={handleAddClick} disabled={!canManagePlans || (isSuperAdmin && allLibraries.length === 0)} title={!canManagePlans ? "Select a specific library to add payment types" : "Add new payment type"}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Payment Type
        </Button>
      </div>
      
      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingPaymentType(undefined); }}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>
                    {editingPaymentType ? "Edit Payment Type" : "Add New Payment Type"}
                    {` for ${currentLibraryName || 'Current Library'}`}
                </DialogTitle>
                <DialogDescription>
                    {editingPaymentType ? "Modify the details of the existing payment type." : "Create a new payment type for students."}
                    {` This will apply to ${currentLibraryName || 'the currently selected library'}.`}
                </DialogDescription>
            </DialogHeader>
            <PaymentTypeForm 
                initialData={editingPaymentType}
                onSubmit={handleFormSubmit}
                isSubmitting={isSubmitting}
                onCancel={() => {setIsFormOpen(false); setEditingPaymentType(undefined);}}
                renderHeader={false}
            />
        </DialogContent>
      </Dialog>

      <Card className="shadow-xl">
        <CardHeader>
            <CardTitle>Existing Payment Types {currentLibraryName ? `for ${currentLibraryName}` : (isSuperAdmin ? " (All Libraries)" : "")}</CardTitle>
            <CardDescription>Manage different payment options for students {currentLibraryName ? `in this library` : (isSuperAdmin ? "across all libraries" : "")}.</CardDescription>
        </CardHeader>
        <CardContent>
            { (isSuperAdmin && allLibraries.length === 0 && !currentLibraryId) ? (
                <div className="text-center py-12">
                    <Library className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-xl font-semibold">No Libraries Exist</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Superadmin must create a library before managing payment types.
                    </p>
                    <Button className="mt-4" onClick={() => router.push('/manage-libraries')}>
                        Manage Libraries
                    </Button>
                </div>
            ) : paymentTypes.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Type Name</TableHead>
                    {isSuperAdmin && !currentLibraryId && <TableHead>Library</TableHead>}
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Cycle</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {paymentTypes.map((plan) => (
                    <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    {isSuperAdmin && !currentLibraryId && <TableCell>{plan.libraryName || 'N/A'}</TableCell>}
                    <TableCell>INR{plan.amount.toFixed(2)}</TableCell>
                    <TableCell>{getFrequencyDisplay(plan.frequency)}</TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={!canManagePlans} title={!canManagePlans ? "Select library to manage" : "Actions"}>
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
                   {currentLibraryName ? `Add a new payment type to start for ${currentLibraryName}.` : (isSuperAdmin && allLibraries.length > 0 ? "No payment types found across all libraries, or select a specific library to add one." : "Add a new payment type.")}
                </p>
                {canManagePlans && (
                 <Button className="mt-4" onClick={handleAddClick}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Payment Type
                </Button>
                )}
            </div>
            )}
        </CardContent>
      </Card>

    </div>
  );
}

