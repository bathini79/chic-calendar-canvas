
import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RegularShifts } from './RegularShifts';
import { SpecificShifts } from './SpecificShifts';
import { TimeOffRequests } from './TimeOffRequests';

export function StaffShifts() {
  const [activeTab, setActiveTab] = useState("regular");
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="regular" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="regular">Regular Shifts</TabsTrigger>
          <TabsTrigger value="specific">Specific Shifts</TabsTrigger>
          <TabsTrigger value="timeoff">Time Off</TabsTrigger>
        </TabsList>
        
        <TabsContent value="regular" className="mt-0">
          <RegularShifts />
        </TabsContent>
        
        <TabsContent value="specific" className="mt-0">
          <SpecificShifts />
        </TabsContent>
        
        <TabsContent value="timeoff" className="mt-0">
          <TimeOffRequests />
        </TabsContent>
      </Tabs>
    </div>
  );
}
