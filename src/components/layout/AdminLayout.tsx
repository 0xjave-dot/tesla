import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-navy-base flex text-white font-sans overflow-hidden">
      {/* Admin Suite Sidebar */}
      <Sidebar 
        isAdminView={true} 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Main Panel Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Real-time Status Topbar */}
        <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Scrollable Frame View */}
        <main className="flex-1 overflow-y-auto bg-navy-base py-6 px-4 md:py-8 md:px-8">
          <div className="max-w-content mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
