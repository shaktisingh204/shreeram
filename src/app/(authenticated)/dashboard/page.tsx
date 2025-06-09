"use client";

import { useEffect, useState } from 'react';
import { DashboardCard } from '@/components/DashboardCard';
import { getDashboardSummary } from '@/lib/data';
import type { DashboardSummary } from '@/types';
import { Users, Armchair, TrendingUp, AlertTriangle, DollarSign, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const sampleMonthlyData = [
  { name: 'Jan', income: 4000, expenses: 2400 },
  { name: 'Feb', income: 3000, expenses: 1398 },
  { name: 'Mar', income: 5000, expenses: 3800 },
  { name: 'Apr', income: 4780, expenses: 2908 },
  { name: 'May', income: 5890, expenses: 4800 },
  { name: 'Jun', income: 4390, expenses: 3800 },
  { name: 'Jul', income: 5490, expenses: 4300 },
];


export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await getDashboardSummary();
      setSummary(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading || !summary) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold text-primary">Dashboard</h1>
      
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
          description={`${((summary.availableSeats / summary.totalSeats) * 100).toFixed(0)}% free`}
          className={summary.availableSeats < summary.totalSeats * 0.1 ? "border-destructive" : "bg-card"}
        />
        <DashboardCard
          title="Monthly Income"
          value={`$${summary.monthlyIncome.toLocaleString()}`}
          icon={TrendingUp}
          description="Income this month"
          className="bg-card"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-primary">Monthly Overview</CardTitle>
            <CardDescription>Income and expenses trend.</CardDescription>
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
                />
                <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }}/>
                <Bar dataKey="income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Income"/>
                <Bar dataKey="expenses" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Expenses"/>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-primary">Fees Due</CardTitle>
            <CardDescription>Students with outstanding payments.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8">
              <AlertTriangle className="h-16 w-16 text-destructive mr-4" />
              <div>
                <p className="text-4xl font-bold text-destructive">{summary.feesDueToday}</p>
                <p className="text-muted-foreground">Students owe fees</p>
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
    </div>
  );
}
