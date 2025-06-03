import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Calendar, CreditCard, Settings, Users } from 'lucide-react';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  
  const isActive = (path: string) => {
    return currentPath.includes(path);
  };
    const navItems = [
    {
      title: 'General',
      href: '/admin/settings/team',
      icon: <Settings className="h-5 w-5" />,
      exact: true
    },
    {
      title: 'Staff',
      href: '/admin/settings/team/staff',
      icon: <Users className="h-5 w-5" />
    },
    {
      title: 'Pay Periods',
      href: '/admin/settings/team/pay-periods',
      icon: <Calendar className="h-5 w-5" />
    },
    {
      title: 'Pay Configuration',
      href: '/admin/settings/team/pay-config',
      icon: <Settings className="h-5 w-5" />
    },
    {
      title: 'Payment Methods',
      href: '/admin/settings/team/payment',
      icon: <CreditCard className="h-5 w-5" />
    }
  ];
  
  return (
    <nav className={cn("space-y-1", className)}>
      {navItems.map((item) => {
        const active = item.exact 
          ? currentPath === item.href 
          : isActive(item.href);
          
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-md",
              active
                ? "bg-gray-100 text-gray-900"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <span className={cn(
              "mr-3",
              active ? "text-gray-500" : "text-gray-400"
            )}>
              {item.icon}
            </span>
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}