
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Loader2, Library, ChevronsUpDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

function LibrarySwitcher() {
  const { 
    currentLibraryId, 
    currentLibraryName, 
    isSuperAdmin, 
    isManager, 
    allLibraries, 
    switchLibraryContext 
  } = useAuth();

  const handleLibraryChange = (newLibId: string) => {
    if (newLibId !== currentLibraryId) {
      switchLibraryContext(newLibId);
    }
  };

  // Show switcher for SA, or for Managers who have more than one library.
  const showSwitcher = isSuperAdmin || (isManager && allLibraries.length > 1);
  if (!showSwitcher) return null;
  
  if (isManager && allLibraries.length <= 1) return null;


  return (
     <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-48 justify-between">
                <div className="flex items-center truncate">
                    <Library className="mr-2 h-4 w-4" />
                    <span className="truncate">{currentLibraryName || "Select Library"}</span>
                </div>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
            <DropdownMenuRadioGroup value={currentLibraryId || ""} onValueChange={handleLibraryChange}>
                 {isSuperAdmin && (
                    <DropdownMenuRadioItem value="">All Libraries</DropdownMenuRadioItem>
                 )}
                 {allLibraries.map(lib => (
                    <DropdownMenuRadioItem key={lib.id} value={lib.id}>{lib.name}</DropdownMenuRadioItem>
                 ))}
            </DropdownMenuRadioGroup>
        </DropdownMenuContent>
     </DropdownMenu>
  );
}


export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading, logout, userMetadata } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Or a redirect component, though useEffect handles it
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm">
          <div className="flex items-center gap-4 md:hidden">
            <SidebarTrigger />
          </div>
          <div className="flex flex-1 items-center justify-end gap-4">
            <LibrarySwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="https://placehold.co/100x100" alt="Admin" data-ai-hint="user avatar" />
                    <AvatarFallback>{userMetadata?.displayName?.slice(0,2) || 'AD'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{userMetadata?.displayName || "Admin Account"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
         <footer className="border-t p-4 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Shree Ram Education. All rights reserved.
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
