
"use client";

import { useEffect, useState } from 'react';
import { getLibrariesMetadata, addLibraryMetadata } from '@/lib/data';
import type { LibraryMetadata } from '@/types';
import { LibraryForm, type LibraryFormValues } from './LibraryForm';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Library, CalendarDays } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ManageLibrariesPage() {
  const [libraries, setLibraries] = useState<LibraryMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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
      await fetchData(); // Refresh the list
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message || "Failed to add library.", variant: "destructive" });
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold text-primary mb-2">Manage Libraries</h1>
        <p className="text-muted-foreground">Create and view libraries in the system.</p>
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
    </div>
  );
}
