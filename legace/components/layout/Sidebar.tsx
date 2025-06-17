import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Clock, 
  BarChart4, 
  PieChart, 
  Settings,
  Briefcase,
  Palmtree,
  GanttChart,
  FileText,
  Receipt,
  DollarSign,
  Calculator,
  FolderOpen
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { hasPermission } from '../../lib/permissions';

type NavItemProps = {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
};

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, active }) => {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center px-4 py-3 text-sm font-medium rounded-md mb-1 transition-colors",
        active 
          ? "bg-primary-50 text-primary-700" 
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      )}
    >
      <span className="mr-3">{icon}</span>
      {label}
    </Link>
  );
};

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  
  const menuItems = [
    {
      to: '/dashboard',
      icon: <LayoutDashboard size={20} />,
      label: 'Dashboard',
      permission: ['dashboard', 'read'] as const,
    },
    {
      to: '/employees',
      icon: <Users size={20} />,
      label: 'Team Members',
      permission: ['team', 'read'] as const,
    },
    {
      to: '/projects',
      icon: <Briefcase size={20} />,
      label: 'Projects',
      permission: ['projects', 'read'] as const,
    },
    {
      to: '/projects/management',
      icon: <GanttChart size={20} />,
      label: 'Kanban',
      permission: ['kanban', 'read'] as const,
    },
    {
      to: '/capacity',
      icon: <Calendar size={20} />,
      label: 'Capacity Planning',
      permission: ['capacity', 'read'] as const,
    },
    {
      to: '/timesheets',
      icon: <Clock size={20} />,
      label: 'Timesheets',
      permission: ['timesheets', 'read'] as const,
    },
    {
      to: '/leave',
      icon: <Palmtree size={20} />,
      label: 'Leave Management',
      permission: ['leave', 'read'] as const,
    },
    {
      to: '/expenses',
      icon: <DollarSign size={20} />,
      label: 'Expenses',
      permission: ['expenses', 'read'] as const,
    },
    {
      to: '/estimates',
      icon: <Calculator size={20} />,
      label: 'Estimates',
      permission: ['estimates', 'read'] as const,
    },
    {
      to: '/invoices',
      icon: <Receipt size={20} />,
      label: 'Invoices',
      permission: ['invoices', 'read'] as const,
    },
    {
      to: '/storage',
      icon: <FolderOpen size={20} />,
      label: 'Storage',
      permission: ['storage', 'read'] as const,
    },
    {
      to: '/reports',
      icon: <BarChart4 size={20} />,
      label: 'Reports',
      permission: ['reports', 'read'] as const,
    },
    {
      to: '/settings',
      icon: <Settings size={20} />,
      label: 'Settings',
      permission: ['settings', 'read'] as const,
    },
  ];
  
  const filteredMenuItems = menuItems.filter(item => 
    hasPermission(user, item.permission[0], item.permission[1])
  );
  
  return (
    <aside className="bg-white w-64 h-full shadow-sm border-r border-gray-200 hidden md:block">
      <div className="flex items-center justify-center h-16 border-b border-gray-200">
        <Link to="/dashboard" className="flex items-center">
          <PieChart className="h-8 w-8 text-[#F7931E]" />
          <span className="ml-2 text-xl font-semibold text-gray-900">Caply</span>
        </Link>
      </div>
      <nav className="mt-5 px-2 space-y-1">
        {filteredMenuItems.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            active={location.pathname === item.to}
          />
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;