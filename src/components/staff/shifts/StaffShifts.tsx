
import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { RegularShifts } from './RegularShifts';
import { TimeOffRequests } from './TimeOffRequests';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function StaffShifts() {
  const [activeTab, setActiveTab] = useState<"shifts" | "timeoff">("shifts");
  const [locations, setLocations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(selectedDate, { weekStartsOn: 6 })); // Start on Saturday
  const [weekEnd, setWeekEnd] = useState(endOfWeek(selectedDate, { weekStartsOn: 6 }));
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const isMobile = useIsMobile();

  // Generate week days
  useEffect(() => {
    const days: Date[] = [];
    let day = weekStart;
    
    for (let i = 0; i < 7; i++) {
      days.push(day);
      day = addDays(day, 1);
    }
    
    setWeekDays(days);
  }, [weekStart]);

  // Fetch locations and employees
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch locations
        const { data: locationsData, error: locationsError } = await supabase
          .from('locations')
          .select('*')
          .order('name');
          
        if (locationsError) throw locationsError;

        // Fetch employees
        let employeeQuery = supabase
          .from('employees')
          .select(`
            *,
            employee_locations(location_id)
          `)
          .eq('is_active', true)
          .order('name');
        
        // Filter by location if one is selected
        if (selectedLocation !== 'all') {
          employeeQuery = employeeQuery.or(`employee_locations.location_id.eq.${selectedLocation}`);
        }
        
        const { data: employeesData, error: employeesError } = await employeeQuery;
        
        if (employeesError) throw employeesError;
        
        setLocations(locationsData || []);
        setEmployees(employeesData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [selectedLocation]);

  const goToPreviousWeek = () => {
    const newWeekStart = addDays(weekStart, -7);
    setWeekStart(newWeekStart);
    setWeekEnd(addDays(newWeekStart, 6));
  };

  const goToNextWeek = () => {
    const newWeekStart = addDays(weekStart, 7);
    setWeekStart(newWeekStart);
    setWeekEnd(addDays(newWeekStart, 6));
  };

  // Render mobile view
  if (isMobile) {
    return (
      <div className="pb-16">
        {/* Mobile Header */}
        <div className="sticky top-0 z-10 bg-white p-4 flex items-center justify-between border-b">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-medium">Scheduled shifts</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="19" cy="12" r="1"></circle>
                <circle cx="5" cy="12" r="1"></circle>
              </svg>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </Button>
          </div>
        </div>
        
        {/* Date Navigation */}
        <div className="flex items-center justify-center py-2 px-4 gap-4 bg-gray-50">
          <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {format(weekStart, 'dd MMM')} - {format(weekEnd, 'dd MMM, yyyy')}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Tab Navigation */}
        <div className="p-3">
          <div className="bg-gray-100 rounded-full p-1">
            <Tabs 
              value={activeTab} 
              onValueChange={(value) => setActiveTab(value as "shifts" | "timeoff")} 
              className="w-full"
            >
              <TabsList className="w-full grid grid-cols-2 bg-transparent">
                <TabsTrigger 
                  value="shifts" 
                  className={`rounded-full py-2 ${activeTab === 'shifts' ? 'bg-primary text-white' : 'bg-transparent'}`}
                >
                  Team
                </TabsTrigger>
                <TabsTrigger 
                  value="timeoff" 
                  className={`rounded-full py-2 ${activeTab === 'timeoff' ? 'bg-primary text-white' : 'bg-transparent'}`}
                >
                  Week
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        
        {/* Content based on selected tab */}
        {isLoading ? (
          <div className="p-6 text-center">Loading...</div>
        ) : activeTab === "shifts" ? (
          <div className="pb-16">
            {employees.map(employee => (
              <RegularShifts 
                key={employee.id}
                locations={locations}
                selectedLocation={selectedLocation}
                setSelectedLocation={setSelectedLocation}
                employees={[employee]}
              />
            ))}
          </div>
        ) : (
          <TimeOffRequests 
            locations={locations}
            employees={employees}
          />
        )}
        
        {/* Fixed Mobile Actions */}
        <div className="fixed bottom-0 right-0 p-4">
          <Button 
            className="h-14 w-14 rounded-full shadow-lg"
            onClick={() => setShowAddSheet(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <line x1="12" x2="12" y1="5" y2="19"></line>
              <line x1="5" x2="19" y1="12" y2="12"></line>
            </svg>
          </Button>
        </div>
        
        {/* Mobile Add Options Sheet */}
        <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
          <SheetContent side="bottom" className="rounded-t-xl max-h-[90vh]">
            <SheetHeader className="text-left pb-6">
              <SheetTitle>Add</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-3">
              <Button 
                variant="outline" 
                className="justify-start h-auto py-3 font-normal"
                onClick={() => {
                  setShowAddSheet(false);
                  // Add shift implementation
                }}
              >
                Add specific shift
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto py-3 font-normal"
                onClick={() => {
                  setShowAddSheet(false);
                  // Set regular shifts implementation
                }}
              >
                Set regular shifts
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto py-3 font-normal"
                onClick={() => {
                  setShowAddSheet(false);
                  // Add time off implementation
                }}
              >
                Add time off
              </Button>
            </div>
            <Button 
              variant="outline" 
              className="justify-center mt-4 w-full"
              onClick={() => setShowAddSheet(false)}
            >
              Cancel
            </Button>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Desktop view
  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Staff Shifts</h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "shifts" | "timeoff")}>
        <TabsList>
          <TabsTrigger value="shifts">Regular Shifts</TabsTrigger>
          <TabsTrigger value="timeoff">Time Off Requests</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {isLoading ? (
        <div className="text-center py-10">Loading...</div>
      ) : activeTab === "shifts" ? (
        <RegularShifts 
          locations={locations}
          selectedLocation={selectedLocation}
          setSelectedLocation={setSelectedLocation}
          employees={employees}
        />
      ) : (
        <TimeOffRequests 
          locations={locations}
          employees={employees}
        />
      )}
    </div>
  );
}
