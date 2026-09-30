'use client';

import { SidebarProvider, useSidebar } from '@/components/layout/sidebar-context';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const sidebarWidth = isCollapsed ? '72px' : '260px';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar />
      <Topbar />
      <main className="fade-in" style={{
        marginLeft: sidebarWidth,
        marginTop: '64px',
        padding: '32px',
        width: `calc(100% - ${sidebarWidth})`,
        minHeight: 'calc(100vh - 64px)',
        transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
