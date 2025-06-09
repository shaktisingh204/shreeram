
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { updateAdminPassword } = useAuth();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await updateAdminPassword(newPassword);
      if (success) {
        toast({
          title: "Success",
          description: "Admin password updated successfully.",
        });
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast({
          title: "Error",
          description: "Failed to update password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold text-primary">Settings</h1>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>Manage your admin account settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adminEmail">Admin Email</Label>
            <Input id="adminEmail" type="email" defaultValue="admin@seatsmart.com" disabled />
             <p className="text-sm text-muted-foreground">Admin email is used for display purposes.</p>
          </div>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input 
                id="newPassword" 
                type="password" 
                placeholder="Enter new password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                placeholder="Confirm new password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>}
              Update Password
            </Button>
          </form>
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
