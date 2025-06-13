"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
  Receipt,
  DollarSign,
  Calculator,
  FolderOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  active: boolean
}

const NavItem: React.FC<NavItemProps> = ({ href, icon, label, active }) => {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center px-4 py-3 text-sm font-medium rounded-md mb-1 transition-colors",
        active ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
      )}
    >
      <span className="mr-3">{icon}</span>
      {label}
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()

  const menuItems = [
    {
      href: "/dashboard",
      icon: <LayoutDashboard size={20} />,
      label: "Dashboard",
    },
    {
      href: "/employees",
      icon: <Users size={20} />,
      label: "Team Members",
    },
    {
      href: "/projects",
      icon: <Briefcase size={20} />,
      label: "Projects",
    },
    {
      href: "/projects/management",
      icon: <GanttChart size={20} />,
      label: "Kanban",
    },
    {
      href: "/capacity",
      icon: <Calendar size={20} />,
      label: "Capacity Planning",
    },
    {
      href: "/timesheets",
      icon: <Clock size={20} />,
      label: "Timesheets",
    },
    {
      href: "/leave",
      icon: <Palmtree size={20} />,
      label: "Leave Management",
    },
    {
      href: "/expenses",
      icon: <DollarSign size={20} />,
      label: "Expenses",
    },
    {
      href: "/estimates",
      icon: <Calculator size={20} />,
      label: "Estimates",
    },
    {
      href: "/invoices",
      icon: <Receipt size={20} />,
      label: "Invoices",
    },
    {
      href: "/storage",
      icon: <FolderOpen size={20} />,
      label: "Storage",
    },
    {
      href: "/reports",
      icon: <BarChart4 size={20} />,
      label: "Reports",
    },
    {
      href: "/settings",
      icon: <Settings size={20} />,
      label: "Settings",
    },
  ]

  return (
    <aside className="bg-white w-64 h-full shadow-sm border-r border-gray-200 hidden md:block">
      <div className="flex items-center justify-center h-16 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center">
          <PieChart className="h-8 w-8 text-primary-600" />
          <span className="ml-2 text-xl font-semibold text-gray-900">Caply</span>
        </Link>
      </div>
      <nav className="mt-5 px-2 space-y-1">
        {menuItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={pathname === item.href}
          />
        ))}
      </nav>
    </aside>
  )
}
