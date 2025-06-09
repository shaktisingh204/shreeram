"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";

export default function SettingsPage() {
  // Mock settings state
  // In a real app, these would come from user preferences or backend
  // and a form submission would update them.

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold text-primary">Settings</h1>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>Manage your admin account preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adminEmail">Admin Email</Label>
            <Input id="adminEmail" type="email" defaultValue="admin@seatsmart.com" disabled />
            <p className="text-sm text-muted-foreground">Email cannot be changed in this demo.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" type="password" placeholder="Enter new password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input id="confirmPassword" type="password" placeholder="Confirm new password" />
          </div>
          <Button disabled> {/* Disabled for demo */}
            <Save className="mr-2 h-4 w-4"/>
            Update Password
          </Button>
        </CardContent>
      </Card>
      
      <Separator />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>Configure how you receive notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="emailNotifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive email updates for important events.</p>
            </div>
            <Switch id="emailNotifications" defaultChecked disabled />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="feesDueReminders">Fees Due Reminders</Label>
              <p className="text-sm text-muted-foreground">Get reminders for students with upcoming fee deadlines.</p>
            </div>
            <Switch id="feesDueReminders" defaultChecked disabled />
          </div>
        </CardContent>
      </Card>

      <Separator />
      
       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Application Theme</CardTitle>
          <CardDescription>Customize the look and feel of the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <p className="text-sm text-muted-foreground">Theme customization is currently managed globally. Dark mode can be toggled via browser/OS settings if configured in `globals.css` and `tailwind.config.ts`.</p>
           {/* Example for a manual theme toggle if implemented:
           <div className="flex items-center justify-between">
            <Label htmlFor="darkMode">Dark Mode</Label>
            <Switch id="darkMode" onCheckedChange={(checked) => {
              // This would typically call a context function to toggle theme
              if (checked) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            }}/>
          </div>
          */}
        </CardContent>
      </Card>
    </div>
  );
}
