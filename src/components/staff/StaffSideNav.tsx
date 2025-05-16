import React, { useEffect } from 'react';

interface NavItem {
  title: string;
  sections: {
    id: string;
    name: string;
  }[];
}

interface StaffSideNavProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  // Add a prop to track sections with validation errors
  sectionsWithErrors?: string[];
  // Optional counter to show number of errors per section
  errorCounts?: Record<string, number>;
}

export function StaffSideNav({ 
  activeSection, 
  onSectionChange,
  sectionsWithErrors = [],
}: StaffSideNavProps) {  // No need for custom styling since we use Tailwind classes directly
  const navItems: NavItem[] = [
    {
      title: "Personal",
      sections: [
        { id: "profile", name: "Profile" },
      ],
    },
    {
      title: "Workspace",
      sections: [
        { id: "services", name: "Services" },
        { id: "locations", name: "Locations" },
      ],
    },
    {      
      title: "Pay",
      sections: [
        { id: "commissions", name: "Commissions" },
      ],
    },
  ];
  
  return (
    <div className="w-[280px] border border-gray-200 h-full overflow-y-auto flex-shrink-0 relative">
      {navItems.map((item) => (
        <div key={item.title} className="mb-1">
          <div className="px-4 py-2">
            <h3 className="text-sm font-medium text-gray-600">
              {item.title}
            </h3>
          </div>
          <div>
            {item.sections.map((section) => {
              const isActive = activeSection === section.id;
              const hasError = sectionsWithErrors.includes(section.id);
              
              return (
                <button
                  key={section.id}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-gray-100 text-gray-800 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => onSectionChange(section.id)}
                >
                  <div className="flex items-center justify-between w-full h-6">
                    <span>{section.name}</span>
                    <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                      {hasError ? (
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-4 w-4 text-red-500" 
                          viewBox="0 0 20 20" 
                          fill="currentColor"
                          aria-label="Error"
                        >
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
