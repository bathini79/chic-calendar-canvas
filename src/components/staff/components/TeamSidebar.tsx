import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Users, Calendar, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

export type TeamSection = "team-members" | "scheduled-shifts" | "timesheets" | "pay-runs";

interface TeamSidebarProps {
  activeSection: TeamSection;
  onSectionChange: (section: TeamSection) => void;
  isMobile: boolean;
  onBack?: () => void;
}

interface SidebarItemProps {
  label: string;
  value: TeamSection;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  showRightChevron?: boolean;
}

const SidebarItem = ({ label, active, onClick, icon, showRightChevron = false }: SidebarItemProps) => {
  return (
    <div 
      className={cn(
        "px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors flex items-center",
        active && "bg-gray-50 font-medium border-l-2 border-primary"
      )}
      onClick={onClick}
    >
      <span className="mr-3 text-gray-500">{icon}</span>
      <span className="flex-1">{label}</span>
      {showRightChevron && <ChevronRight size={16} className="text-gray-400" />}
    </div>
  );
};

export function TeamSidebar({ 
  activeSection, 
  onSectionChange, 
  isMobile, 
  onBack 
}: TeamSidebarProps) {
  const navItems = [
    { 
      label: "Staff members", 
      value: "team-members" as TeamSection,
      icon: <Users size={16} />
    },
    { 
      label: "Scheduled shifts", 
      value: "scheduled-shifts" as TeamSection,
      icon: <Calendar size={16} />
    },
    { 
      label: "Timesheets", 
      value: "timesheets" as TeamSection,
      icon: <Clock size={16} />
    },
    { 
      label: "Pay runs", 
      value: "pay-runs" as TeamSection,
      icon: <DollarSign size={16} />
    }
  ];

  return (
    <div className={cn(
      "bg-white border-r flex flex-col shadow-sm",
      isMobile ? "w-full" : "w-60"
    )}>
      {isMobile && onBack && (
        <div className="p-4 border-b">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-1"
            onClick={onBack}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
        </div>
      )}
        <div className="py-2">
        {!isMobile && <div className="px-4 py-3 text-lg font-medium border-b">Staff Management</div>}
        {navItems.map((item) => (
          <SidebarItem 
            key={item.value}
            label={item.label}
            value={item.value}
            active={activeSection === item.value}
            onClick={() => onSectionChange(item.value)}
            icon={item.icon}
            showRightChevron={isMobile}
          />
        ))}
      </div>
    </div>
  );
}
