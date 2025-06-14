
"use client";

import { useEffect, useState } from 'react';
import { getLibrariesMetadata, addLibraryMetadata, deleteLibrary } from '@/lib/data';
import type { LibraryMetadata } from '@/types';
import { LibraryForm, type LibraryFormValues } from './LibraryForm';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Library, CalendarDays, Trash2, MoreHorizontal } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from '@/context/AuthContext'; 

export default function ManageLibrariesPage() {
  const [libraries, setLibraries] = useState<LibraryMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [libraryToDelete, setLibraryToDelete] = useState<LibraryMetadata | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { toast } = useToast();
  const { refreshUserAndLibraries, isSuperAdmin } = useAuth();

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getLibrariesMetadata();
      setLibraries(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch libraries.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFormSubmit = async (values: LibraryFormValues) => {
    setIsSubmitting(true);
    try {
      await addLibraryMetadata(values.name);
      toast({ title: "Success", description: `Library "${values.name}" added.` });
      await fetchData(); 
      await refreshUserAndLibraries(); 
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message || "Failed to add library.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (library: LibraryMetadata) => {
    setLibraryToDelete(library);
    setIsDeleteConfirmOpen(true);
  };

  const executeDeleteLibrary = async () => {
    if (!libraryToDelete) return;
    setIsDeleting(true);
    try {
      await deleteLibrary(libraryToDelete.id);
      toast({ title: "Success", description: `Library "${libraryToDelete.name}" deleted.` });
      setLibraryToDelete(null);
      await fetchData();
      await refreshUserAndLibraries();
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message || `Failed to delete library "${libraryToDelete.name}".`, variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!isSuperAdmin) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
            <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold text-primary mb-2">Manage Libraries</h1>
        <p className="text-muted-foreground">Create, view, and delete libraries in the system.</p>
      </div>

      <LibraryForm onSubmit={handleFormSubmit} isSubmitting={isSubmitting} />

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Existing Libraries</CardTitle>
          <CardDescription>List of all libraries currently in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {libraries.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Library Name</TableHead>
                    <TableHead>Library ID</TableHead>
                    <TableHead>Created On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {libraries.map((lib) => (
                    <TableRow key={lib.id}>
                      <TableCell className="font-medium flex items-center">
                        <Library className="mr-2 h-4 w-4 text-accent" />
                        {lib.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{lib.id}</TableCell>
                      <TableCell>
                        <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground inline-block" />
                        {new Date(lib.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDeleteClick(lib)} className="text-destructive">
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
              <Library className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-xl font-semibold">No Libraries Found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a new library using the form above to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the library "{libraryToDelete?.name}" (ID: {libraryToDelete?.id})? 
              This action is irreversible and will delete all associated students, seats, payments, and payment types within this library. 
              Any managers assigned to this library will be unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLibraryToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeDeleteLibrary} 
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Library
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

