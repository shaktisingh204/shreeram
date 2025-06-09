
"use client";

import { useEffect, useState } from 'react';
import { DashboardCard } from '@/components/DashboardCard';
import { getDashboardSummary, getUsersMetadata } from '@/lib/data'; // Added getUsersMetadata
import type { DashboardSummary, UserMetadata } from '@/types'; // Added UserMetadata
import { Users, Armchair, TrendingUp, AlertTriangle, DollarSign, Loader2, LogIn, Library as LibraryIcon } from 'lucide-react';
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
  const { user, userMetadata, currentLibraryId, currentLibraryName, loading: authLoading, isSuperAdmin, switchLibraryContext } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [managers, setManagers] = useState<UserMetadata[]>([]); // For superadmin to list managers
  const [loadingData, setLoadingData] = useState(true);
  const [loadingManagers, setLoadingManagers] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) { 
        setLoadingData(true);
        if (isSuperAdmin) setLoadingManagers(true);
        return;
      }

      if (!currentLibraryId && user) { // User authenticated, but no library context yet (could be superadmin without a selection)
         if (isSuperAdmin && userMetadata?.assignedLibraryId) {
            // Superadmin might have an assigned default, try to load that first
            // but actual selection happens in header. Data fetching for summary should wait for currentLibraryId
         } else {
            setLoadingData(false); 
            if (isSuperAdmin) setLoadingManagers(false);
            return;
         }
      }
      
      setLoadingData(true); 
      try {
        if (currentLibraryId) { // Only fetch summary if a library context is set
          const data = await getDashboardSummary(currentLibraryId);
          setSummary(data);
        } else if (!isSuperAdmin) { // Manager without library context is an error
            setSummary(null);
        }
        // If superadmin and no currentLibraryId, summary remains null, but manager list can load
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
  }, [currentLibraryId, authLoading, isSuperAdmin, user, userMetadata]);

  const handleImpersonateManager = async (manager: UserMetadata) => {
    if (!isSuperAdmin || !manager.assignedLibraryId) return;
    try {
      await switchLibraryContext(manager.assignedLibraryId);
      // router.push('/dashboard'); // No need to push, useEffect on currentLibraryId will re-fetch
    } catch (error) {
      console.error("Failed to switch context for manager impersonation:", error);
    }
  };


  if (authLoading || loadingData || (isSuperAdmin && loadingManagers)) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!currentLibraryId && user && !isSuperAdmin) { // Manager is authenticated, but no library context (config error)
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
  
  // Superadmin view when no library is selected (e.g. first load, or no libraries exist)
  if (isSuperAdmin && !currentLibraryId) {
     return (
      <div className="space-y-6">
        <h1 className="text-3xl font-headline font-bold text-primary">Dashboard (Superadmin Overview)</h1>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-primary">Select a Library Context</CardTitle>
            <CardDescription>Please select a library from the header dropdown to view its specific dashboard. Below you can quickly switch to a manager's library context.</CardDescription>
          </CardHeader>
        </Card>
        {isSuperAdmin && (
          <ManagerContextSwitcherCard managers={managers} onImpersonate={handleImpersonateManager} isLoading={loadingManagers} />
        )}
      </div>
    )
  }

  if (!summary && currentLibraryId) { // Library context exists, but failed to fetch summary
     return (
      <div className="flex flex-col justify-center items-center h-full text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-xl font-semibold">Could not load dashboard data for {currentLibraryName}.</p>
        <p className="text-muted-foreground">Please try refreshing, or check if the library has data.</p>
      </div>
    );
  }
  
  if (!summary) { // Catch-all if summary is null for any other reason after loading (e.g. manager has no lib)
      return (
        <div className="flex justify-center items-center h-full">
           <p className="text-muted-foreground">No dashboard data to display.</p>
        </div>
      )
  }


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold text-primary">Dashboard ({summary.libraryName || currentLibraryName || 'Overview'})</h1>
      
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
            <CardDescription>Earnings and spending trend for {summary.libraryName || currentLibraryName}.</CardDescription>
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
        ) : (
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
      {/* If not super admin, show the fees due card in its original place (if lg:grid-cols-2 was used) */}
       {!isSuperAdmin && (
         <div className="grid gap-6 md:grid-cols-2">
            <div></div> {/* Empty div to occupy space of the barchart if needed for layout consistency, or remove if Monthly Overview takes full width */}
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
         </div>
       )}


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
                <li key={manager.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50">
                  <div>
                    <p className="font-medium">{manager.displayName}</p>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <LibraryIcon className="h-3 w-3 mr-1.5 text-accent"/>
                      {manager.assignedLibraryName || "N/A"}
                    </p>
                  </div>
                  {manager.assignedLibraryId && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onImpersonate(manager)}
                      title={`View as ${manager.displayName}`}
                    >
                      <LogIn className="mr-2 h-4 w-4 text-accent" /> View
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground text-center py-8">No managers found.</p>
        )}
      </CardContent>
    </Card>
  );
}
