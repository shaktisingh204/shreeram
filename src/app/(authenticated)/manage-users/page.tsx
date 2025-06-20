
"use client";

import { useEffect, useState } from 'react';
import { getUsersMetadata, setUserMetadata, getLibrariesMetadata } from '@/lib/data';
import type { UserMetadata, LibraryMetadata } from '@/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Loader2, UsersRound, ShieldCheck, ShieldAlert, LogIn, Library } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserForm, type UserFormValues } from './UserForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { createManagerAction } from './actions';
import { useRouter } from 'next/navigation';

export default function ManageUsersPage() {
  const { user: authUser, isSuperAdmin, loading: authLoading, switchLibraryContext } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserMetadata[]>([]);
  const [libraries, setLibraries] = useState<LibraryMetadata[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserMetadata | undefined>(undefined);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const usersData = await getUsersMetadata();
      const libsData = await getLibrariesMetadata();
      setUsers(usersData);
      setLibraries(libsData);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch user or library data.", variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isSuperAdmin) {
      fetchData();
    }
  }, [authLoading, isSuperAdmin]);

  const handleAddClick = () => {
    setEditingUser(undefined);
    setFormMode('add');
    setIsFormOpen(true);
  };

  const handleEditClick = (user: UserMetadata) => {
    setEditingUser(user);
    setFormMode('edit');
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (values: UserFormValues) => {
    setIsSubmitting(true);
    try {
      const assignedLibs: { [id: string]: string } = {};
      if (values.assignedLibraries) {
        for (const libId in values.assignedLibraries) {
          if (values.assignedLibraries[libId]) {
            const lib = libraries.find(l => l.id === libId);
            if (lib) {
              assignedLibs[libId] = lib.name;
            }
          }
        }
      }

      if (formMode === 'edit' && editingUser) {
        const metadataToSet: Omit<UserMetadata, 'id'> = {
          email: values.email,
          displayName: values.displayName,
          mobileNumber: values.mobileNumber || undefined,
          role: "manager",
          assignedLibraries: assignedLibs,
        };
        await setUserMetadata(editingUser.id, metadataToSet);
        toast({ title: "Success", description: `Manager ${values.displayName} updated.` });
      } else if (formMode === 'add') {
        const result = await createManagerAction({
            email: values.email,
            password: values.password!, 
            displayName: values.displayName,
            mobileNumber: values.mobileNumber,
            role: "manager",
            assignedLibraries: assignedLibs,
        });
        if (result.success) {
            toast({ title: "Success", description: result.message });
        } else {
            throw new Error(result.message);
        }
      }
      await fetchData();
      setIsFormOpen(false);
      setEditingUser(undefined);
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message || "Failed to save user.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImpersonateManager = async (manager: UserMetadata) => {
    if (!isSuperAdmin) {
      toast({ title: "Error", description: "Only superadmins can impersonate managers.", variant: "destructive" });
      return;
    }
    const assignedLibIds = manager.assignedLibraries ? Object.keys(manager.assignedLibraries) : [];
    if (assignedLibIds.length === 0) {
      toast({ title: "Error", description: "Manager does not have an assigned library.", variant: "destructive" });
      return;
    }
    try {
      await switchLibraryContext(assignedLibIds[0]); // Impersonate the first assigned library
      toast({ title: "Context Switched", description: `Viewing as ${manager.displayName} for library: ${manager.assignedLibraries?.[assignedLibIds[0]]}.` });
      router.push('/dashboard');
    } catch (error) {
      toast({ title: "Error", description: "Could not switch library context.", variant: "destructive" });
    }
  };
  
  if (authLoading || loadingData) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
            <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
    );
  }

  const getAssignedLibrariesDisplay = (assignedLibs?: { [id: string]: string }) => {
    if (!assignedLibs || Object.keys(assignedLibs).length === 0) {
      return 'N/A';
    }
    return (
        <ul className="list-disc list-inside">
            {Object.values(assignedLibs).map(name => <li key={name}>{name}</li>)}
        </ul>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline font-bold text-primary">Manage Users</h1>
        <Button onClick={handleAddClick}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Manager
        </Button>
      </div>
      
      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingUser(undefined); }}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>
                    {formMode === 'edit' ? 
                        (editingUser ? `Edit Manager: ${editingUser.displayName}` : "Edit Manager") : 
                        "Add New Manager"}
                </DialogTitle>
                {formMode === 'add' && (
                    <DialogDescription>
                        Create a new manager account and assign them to one or more libraries.
                    </DialogDescription>
                )}
                 {formMode === 'edit' && editingUser && (
                    <DialogDescription>
                        Update details for {editingUser.displayName}. Email cannot be changed.
                    </DialogDescription>
                )}
            </DialogHeader>
            <UserForm 
                initialData={editingUser}
                onSubmit={handleFormSubmit}
                isSubmitting={isSubmitting}
                onCancel={() => {setIsFormOpen(false); setEditingUser(undefined);}}
                mode={formMode}
                renderHeader={false} 
            />
        </DialogContent>
      </Dialog>

      <Card className="shadow-xl">
        <CardHeader>
            <CardTitle>User List</CardTitle>
            <CardDescription>Manage user roles and library assignments. Superadmin role is system-defined.</CardDescription>
        </CardHeader>
        <CardContent>
            {users.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned Library</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {users.map((user) => (
                    <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.displayName || 'N/A'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.mobileNumber || 'N/A'}</TableCell>
                    <TableCell>
                        <Badge variant={user.role === 'superadmin' ? 'default' : 'secondary'} className="capitalize flex items-center gap-1">
                         {user.role === 'superadmin' ? <ShieldCheck className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3 text-muted-foreground" />}
                         {user.role}
                        </Badge>
                    </TableCell>
                    <TableCell>{user.role === 'manager' ? getAssignedLibrariesDisplay(user.assignedLibraries) : 'All (Superadmin)'}</TableCell>
                    <TableCell className="text-right space-x-2">
                        {user.role !== 'superadmin' && ( 
                             <Button variant="outline" size="sm" onClick={() => handleEditClick(user)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </Button>
                        )}
                        {isSuperAdmin && user.role === 'manager' && user.id !== authUser?.uid && user.assignedLibraries && Object.keys(user.assignedLibraries).length > 0 && (
                            <Button variant="ghost" size="sm" onClick={() => handleImpersonateManager(user)} title={`Impersonate ${user.displayName}`}>
                                <LogIn className="mr-2 h-4 w-4 text-accent" /> Impersonate
                            </Button>
                        )}
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </div>
            ) : (
             <div className="text-center py-12">
                <UsersRound className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-xl font-semibold">No Users Found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Add managers to assign them to libraries.
                </p>
                 <Button className="mt-4" onClick={handleAddClick}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Manager
                </Button>
            </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
