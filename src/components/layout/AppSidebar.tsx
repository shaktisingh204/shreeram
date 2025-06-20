
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Armchair,
  DollarSign,
  FileText,
  ListChecks,
  LogOut,
  Settings,
  BookOpenCheck,
  Library,
  UsersRound, 
  DatabaseZap,
} from 'lucide-react';

const navItemsBase = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/seats', label: 'Seat Setup', icon: Armchair },
  { href: '/fees', label: 'Fee Collection', icon: DollarSign },
  { href: '/reports', label: 'Statements', icon: FileText },
  { href: '/fee-plans', label: 'Payment Types', icon: ListChecks },
];

const superAdminNavItems = [
  ...navItemsBase,
  { href: '/manage-libraries', label: 'Manage Libraries', icon: Library },
  { href: '/manage-users', label: 'Manage Users', icon: UsersRound },
  { href: '/admin-utils', label: 'Export Data', icon: DatabaseZap }, 
];

const managerNavItems = navItemsBase;


export function AppSidebar() {
  const pathname = usePathname();
  const { logout, isSuperAdmin, isManager, brandingConfig } = useAuth();

  const navItems = isSuperAdmin ? superAdminNavItems : (isManager ? managerNavItems : []);

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left">
      <SidebarHeader className="flex items-center justify-center p-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center justify-center gap-2 group-data-[collapsible=icon]:justify-center">
            {brandingConfig?.logoUrl ? (
               <Image
                    src={brandingConfig.logoUrl}
                    alt="App Logo"
                    width={brandingConfig.logoWidth}
                    height={brandingConfig.logoHeight}
                    style={{
                        width: `${brandingConfig.logoWidth}px`,
                        height: `${brandingConfig.logoHeight}px`
                    }}
                    className="object-contain group-data-[collapsible=icon]:hidden"
                />
            ) : (
                <BookOpenCheck className="h-8 w-8 text-sidebar-primary group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7" />
            )}
            <h1 className="text-xl font-headline font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                {!brandingConfig?.logoUrl && "Shree Ram Education"}
            </h1>
        </Link>
      </SidebarHeader>
      <SidebarContent className="flex-1 overflow-y-auto">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={pathname.startsWith(item.href)}
                  tooltip={item.label}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
             <Link href="/settings">
                <SidebarMenuButton tooltip="Settings">
                    <Settings />
                    <span>Settings</span>
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout} tooltip="Logout">
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
