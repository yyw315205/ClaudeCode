import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Building2, Settings, GitBranch } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/pipelines', label: 'Pipelines', icon: GitBranch },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar — HubSpot dark navy */}
      <aside className="w-52 flex-shrink-0 flex flex-col" style={{ backgroundColor: '#1e2a3b' }}>
        {/* Logo */}
        <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ff7a59' }}>
              <GitBranch size={14} className="text-white" />
            </div>
            <span className="font-bold text-white text-base tracking-tight">LeanCRM</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'text-white'
                    : 'text-white/50 hover:text-white/80'
                }`
              }
              style={({ isActive }) =>
                isActive ? { backgroundColor: 'rgba(255,255,255,0.1)' } : {}
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Lean CRM v1.0</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
