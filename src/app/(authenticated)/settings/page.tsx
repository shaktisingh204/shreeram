
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { BrandingSettingsForm } from "./BrandingSettingsForm";

export default function SettingsPage() {
  const { user, isSuperAdmin } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold text-primary">Settings</h1>

      {isSuperAdmin && (
        <>
          <BrandingSettingsForm />
          <Separator />
        </>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>Manage your admin account settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adminEmail">Admin Email</Label>
            <Input id="adminEmail" type="email" value={user?.email || ""} disabled />
             <p className="text-sm text-muted-foreground">This is your login email. To change your password, use Firebase Authentication's password reset features.</p>
          </div>
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
              <p className="text-sm text-muted-foreground">Get email updates for key events.</p>
            </div>
            <Switch id="emailNotifications" defaultChecked disabled />
             <p className="text-xs text-muted-foreground"> (Feature not implemented)</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="feesDueReminders">Fees Due Reminders</Label>
              <p className="text-sm text-muted-foreground">Get reminders for student fee deadlines.</p>
            </div>
            <Switch id="feesDueReminders" defaultChecked disabled />
             <p className="text-xs text-muted-foreground"> (Feature not implemented)</p>
          </div>
        </CardContent>
      </Card>

      <Separator />
      
       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Application Theme</CardTitle>
          <CardDescription>Change how the app looks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <p className="text-sm text-muted-foreground">Theme customization is currently managed globally. Dark mode can be toggled via browser/OS settings if configured in `globals.css` and `tailwind.config.ts`.</p>
        </CardContent>
      </Card>
    </div>
  );
}
