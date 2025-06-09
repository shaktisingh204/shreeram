
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import Image from 'next/image';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/seats', label: 'Seats', icon: Armchair },
  { href: '/fees', label: 'Fees', icon: DollarSign },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/fee-plans', label: 'Fee Plans', icon: ListChecks },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left">
      <SidebarHeader className="flex items-center justify-center p-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <BookOpenCheck className="h-8 w-8 text-sidebar-primary group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7" />
          <h1 className="text-2xl font-headline font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            SeatSmart
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
