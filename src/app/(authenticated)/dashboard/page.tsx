
"use client";

import { useEffect, useState } from 'react';
import { DashboardCard } from '@/components/DashboardCard';
import { getDashboardSummary, getUsersMetadata } from '@/lib/data';
import type { DashboardSummary, UserMetadata } from '@/types';
import { Users, Armchair, TrendingUp, AlertTriangle, DollarSign, Loader2, LogIn, Library as LibraryIcon, EyeOff } from 'lucide-react'; // Added EyeOff
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';

const sampleMonthlyData = [
  { name: 'Jan', income: 40000, expenses: 24000 },
  { name: 'Feb', income: 30000, expenses: 13980 },
  { name: 'Mar', income: 50000, expenses: 38000 },
  { name: 'Apr', income: 47800, expenses: 29080 },
  { name: 'May', income: 58900, expenses: 48000 },
  { name: 'Jun', income: 43900, expenses: 38000 },
  { name: 'Jul', income: 54900, expenses: 43000 },
];


export default function DashboardPage() {
  const { 
    user, 
    userMetadata, 
    currentLibraryId, 
    currentLibraryName, 
    loading: authLoading, 
    isSuperAdmin, 
    isManager, // Added for clarity
    switchLibraryContext, 
    allLibraries, 
    isImpersonating, 
    revertToSuperAdminView 
  } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [managers, setManagers] = useState<UserMetadata[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingManagers, setLoadingManagers] = useState(false);

  const pageTitle = currentLibraryName || (isSuperAdmin && !currentLibraryId ? "All Libraries Overview" : "Overview");

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) { 
        setLoadingData(true);
        if (isSuperAdmin) setLoadingManagers(true);
        return;
      }

      // Determine library ID for summary fetching
      // For superadmin, if currentLibraryId is null, it means "All Libraries" view
      const libraryIdForSummary = isSuperAdmin && currentLibraryId === null ? null : currentLibraryId;

      setLoadingData(true); 
      try {
        if (libraryIdForSummary !== undefined) { // Fetch if context is set (null is valid for SA all libs) or if manager has a lib
           if (isManager && !libraryIdForSummary) { // Manager must have a library context
             setSummary(null); // Or show an error specific to manager config
           } else {
            const data = await getDashboardSummary(libraryIdForSummary);
            setSummary(data);
           }
        } else if (isManager) { // Manager has no library context (error state)
            setSummary(null);
        }
        // If superadmin and no libraries exist (libraryIdForSummary might be null, and summary might be from getDashboardSummary(null))
      } catch (error) {
        console.error("Failed to fetch dashboard summary:", error);
        setSummary(null); 
      } finally {
        setLoadingData(false);
      }

      if (isSuperAdmin) {
        setLoadingManagers(true);
        try {
          const allUsers = await getUsersMetadata();
          setManagers(allUsers.filter(u => u.role === 'manager' && u.assignedLibraryId && u.assignedLibraryName));
        } catch (error) {
          console.error("Failed to fetch managers:", error);
          setManagers([]);
        } finally {
          setLoadingManagers(false);
        }
      }
    };
    fetchData();
  }, [currentLibraryId, authLoading, isSuperAdmin, isManager, user, userMetadata]); // Added isManager

  const handleImpersonateManager = async (manager: UserMetadata) => {
    if (!isSuperAdmin || !manager.assignedLibraryId) return;
    try {
      await switchLibraryContext(manager.assignedLibraryId);
    } catch (error) {
      console.error("Failed to switch context for manager impersonation:", error);
    }
  };

  const handleRevertToSuperAdminView = async () => {
    await revertToSuperAdminView();
  };


  if (authLoading || loadingData || (isSuperAdmin && loadingManagers && !isImpersonating)) { // Don't block for manager loading if impersonating
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // Specific state for manager without library context
  if (isManager && !currentLibraryId && user) {
     return (
      <div className="flex flex-col justify-center items-center h-full text-center p-4">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <p className="text-2xl font-semibold text-destructive">Configuration Incomplete</p>
        <p className="text-muted-foreground mt-2">
          Your manager account is authenticated, but essential configuration (like library assignment) is missing.
        </p>
         <p className="text-sm text-muted-foreground mt-3">
          Please contact your superadmin for assistance.
        </p>
      </div>
    );
  }
  
  // Superadmin view when no library is selected (e.g. first load, or explicitly reverted to "All Libraries")
  // AND no libraries exist at all in the system.
  if (isSuperAdmin && currentLibraryId === null && !isImpersonating && allLibraries.length === 0) {
     return (
      <div className="space-y-6">
        <h1 className="text-3xl font-headline font-bold text-primary">Dashboard (Superadmin Overview)</h1>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-primary">No Libraries Found</CardTitle>
            <CardDescription>Please create a library first to see dashboard data or manage contexts.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/manage-libraries')}>Manage Libraries</Button>
          </CardContent>
        </Card>
        {/* Manager context switcher might be empty but can still be shown structurally */}
        <ManagerContextSwitcherCard managers={managers} onImpersonate={handleImpersonateManager} isLoading={loadingManagers} />
      </div>
    )
  }
  
  // Superadmin initial view or when "All Libraries" is selected (currentLibraryId is null), but libraries *do* exist
  // Or when impersonating any library. The summary will be for "All Libraries" or the impersonated one.
  // The key difference from above is that `summary` should be available for "All Libraries" if libs exist.
  if (isSuperAdmin && currentLibraryId === null && !isImpersonating && allLibraries.length > 0 && !summary) {
      // This case means "All Libraries" summary is still loading or failed, show loader/error
      // If summary is null, but we expect "All Libraries" data
      return (
          <div className="flex justify-center items-center h-full">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4">Loading All Libraries Overview...</p>
          </div>
      );
  }


  if (!summary && (currentLibraryId || (isSuperAdmin && currentLibraryId === null))) { 
     // This covers:
     // 1. Manager with a library context, but summary failed.
     // 2. Superadmin impersonating a library, but summary failed.
     // 3. Superadmin on "All Libraries" view (currentLibraryId is null), but summary failed.
     return (
      <div className="flex flex-col justify-center items-center h-full text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-xl font-semibold">Could not load dashboard data for {pageTitle}.</p>
        <p className="text-muted-foreground">Please try refreshing, or check if data exists.</p>
      </div>
    );
  }
  
  if (!summary) { // Final catch-all if summary is null after loading.
      return (
        <div className="flex justify-center items-center h-full">
           <p className="text-muted-foreground">No dashboard data to display for {pageTitle}.</p>
        </div>
      )
  }

  return (
    <div className="space-y-6">
      {isSuperAdmin && isImpersonating && (
        <div className="mb-6 text-center sm:text-left">
          <Button onClick={handleRevertToSuperAdminView} variant="outline" className="w-full sm:w-auto">
            <EyeOff className="mr-2 h-4 w-4" /> Revert to All Libraries View
          </Button>
        </div>
      )}

      <h1 className="text-3xl font-headline font-bold text-primary">Dashboard ({pageTitle})</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Total Students"
          value={summary.totalStudents}
          icon={Users}
          description="Active students"
          className="bg-card"
        />
        <DashboardCard
          title="Total Seats"
          value={summary.totalSeats}
          icon={Armchair}
          description="All available seats"
          className="bg-card"
        />
        <DashboardCard
          title="Available Seats"
          value={summary.availableSeats}
          icon={Armchair}
          description={`${summary.totalSeats > 0 ? ((summary.availableSeats / summary.totalSeats) * 100).toFixed(0) : 0}% free`}
          className={summary.totalSeats > 0 && summary.availableSeats < summary.totalSeats * 0.1 ? "border-destructive" : "bg-card"}
        />
        <DashboardCard
          title="Monthly Earnings"
          value={`INR${summary.monthlyIncome.toLocaleString()}`}
          icon={TrendingUp}
          description="Earnings this month"
          className="bg-card"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-lg lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline text-primary">Monthly Overview</CardTitle>
            <CardDescription>
              {isSuperAdmin && currentLibraryId === null && !isImpersonating 
                ? "Sample trend data shown. Aggregated financial data across all libraries is complex and not shown here." 
                : `Earnings and spending trend for ${summary.libraryName || pageTitle}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sampleMonthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
                <YAxis stroke="hsl(var(--foreground))" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => `INR${value.toLocaleString()}`}
                />
                <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }}/>
                <Bar dataKey="income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Earnings"/>
                <Bar dataKey="expenses" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Expenses"/>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {isSuperAdmin ? (
           <ManagerContextSwitcherCard managers={managers} onImpersonate={handleImpersonateManager} isLoading={loadingManagers} />
        ) : ( // This branch is for Managers
            <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-primary">Fees Due</CardTitle>
                <CardDescription>Students with payments to be made.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-center p-8">
                <AlertTriangle className="h-16 w-16 text-destructive mr-4" />
                <div>
                    <p className="text-4xl font-bold text-destructive">{summary.studentsWithDues}</p>
                    <p className="text-muted-foreground">Students need to pay</p>
                </div>
                </div>
                <div className="mt-4 text-center">
                    <DollarSign className="h-10 w-10 text-green-500 inline-block" />
                    <p className="text-xl font-semibold text-green-600">All fees collected for today!</p>
                    <p className="text-sm text-muted-foreground">This is a placeholder. Real logic for fees due today vs collected to be implemented.</p>
                </div>
            </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}


interface ManagerContextSwitcherCardProps {
  managers: UserMetadata[];
  onImpersonate: (manager: UserMetadata) => void;
  isLoading: boolean;
}

function ManagerContextSwitcherCard({ managers, onImpersonate, isLoading }: ManagerContextSwitcherCardProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-primary">Manager Library Contexts</CardTitle>
        <CardDescription>Quickly switch to view as a specific manager.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : managers.length > 0 ? (
          <ScrollArea className="h-[250px]">
            <ul className="space-y-3">
              {managers.map(manager => (
                <li key={manager.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors shadow-sm">
                  <div>
                    <p className="font-semibold text-foreground">{manager.displayName}</p>
                    <p className="text-sm text-muted-foreground flex items-center mt-0.5">
                      <LibraryIcon className="h-3.5 w-3.5 mr-1.5 text-accent"/>
                      {manager.assignedLibraryName || "N/A"}
                    </p>
                  </div>
                  {manager.assignedLibraryId && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onImpersonate(manager)}
                      title={`View as ${manager.displayName}`}
                      className="px-3 py-1.5"
                    >
                      <LogIn className="mr-1.5 h-4 w-4 text-accent" /> View
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground text-center py-8">No managers found to display.</p>
        )}
      </CardContent>
    </Card>
  );
}

