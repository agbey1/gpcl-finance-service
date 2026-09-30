'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  isCollapsed: false,
  toggleSidebar: () => {},
  setCollapsed: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('gpcl_sidebar_collapsed');
    if (saved === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('gpcl_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  const setCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gpcl_sidebar_collapsed', String(collapsed));
    }
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed: mounted ? isCollapsed : false, toggleSidebar, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
