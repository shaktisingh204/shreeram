
"use client";

import { useEffect, useState } from 'react';
import { DashboardCard } from '@/components/DashboardCard';
import { getDashboardSummary, getUsersMetadata } from '@/lib/data';
import type { DashboardSummary, UserMetadata } from '@/types';
import { Users, Armchair, TrendingUp, AlertTriangle, DollarSign, Loader2, LogIn, Library as LibraryIcon, EyeOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function DashboardPage() {
  const { 
    user, 
    userMetadata, 
    currentLibraryId, 
    currentLibraryName, 
    loading: authLoading, 
    isSuperAdmin, 
    isManager,
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

      const libraryIdForSummary = currentLibraryId;

      setLoadingData(true); 
      try {
         if (isManager && !libraryIdForSummary) { 
             setSummary(null);
           } else { // Superadmin (null or specific lib) or Manager with a lib
            const data = await getDashboardSummary(libraryIdForSummary);
            setSummary(data);
           }
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
  }, [currentLibraryId, authLoading, isSuperAdmin, isManager, user, userMetadata]);

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

  const chartData = summary ? [{ name: pageTitle, earnings: summary.monthlyIncome }] : [];


  if (authLoading || loadingData || (isSuperAdmin && loadingManagers && !isImpersonating)) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
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
        <ManagerContextSwitcherCard managers={managers} onImpersonate={handleImpersonateManager} isLoading={loadingManagers} />
      </div>
    )
  }
  
  if (isSuperAdmin && currentLibraryId === null && !isImpersonating && allLibraries.length > 0 && !summary) {
      return (
          <div className="flex justify-center items-center h-full">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4">Loading All Libraries Overview...</p>
          </div>
      );
  }

  if (!summary && (currentLibraryId || (isSuperAdmin && currentLibraryId === null))) { 
     return (
      <div className="flex flex-col justify-center items-center h-full text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-xl font-semibold">Could not load dashboard data for {pageTitle}.</p>
        <p className="text-muted-foreground">Please try refreshing, or check if data exists.</p>
      </div>
    );
  }
  
  if (!summary) {
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
            <CardTitle className="font-headline text-primary">Monthly Earnings Overview</CardTitle>
            <CardDescription>
              {`Current month's earnings for ${pageTitle}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
             {chartData.length > 0 && chartData[0].earnings > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--foreground))" 
                        formatter={(value: number) => `INR${value.toLocaleString()}`} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--foreground))" width={150} />
                    <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [`INR${value.toLocaleString()}`, "Earnings"]}
                    />
                    <Bar dataKey="earnings" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Earnings" barSize={60}/>
                </BarChart>
                </ResponsiveContainer>
             ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mb-2" />
                    <p>No earnings data to display for the current month.</p>
                </div>
             )}
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
