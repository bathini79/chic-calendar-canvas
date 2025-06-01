import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { LoaderCircle, Plus, Minus, FileText } from "lucide-react";
import { usePayroll } from "@/hooks/use-payroll";
import { AdjustmentData } from "@/services/payRunService";

interface AdjustmentModalProps {
  open: boolean;
  onClose: () => void;
  payRunId: string;
  employeeId: string;
  employeeName: string;
  onSuccess?: () => void;
}

export function AdjustmentModal({
  open,
  onClose,
  payRunId,
  employeeId,
  employeeName,
  onSuccess
}: AdjustmentModalProps) {
  // State
  const [activeTab, setActiveTab] = useState<'wages' | 'commissions' | 'tips' | 'other'>('wages');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isAddition, setIsAddition] = useState<boolean>(true);
  
  // Hooks
  const { addAdjustment } = usePayroll();
  
  // Reset form
  const resetForm = () => {
    setAmount('');
    setNote('');
    setIsAddition(true);
  };
  
  // Handle close
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  // Handle submit
  const handleSubmit = async () => {
    if (!amount || isNaN(parseFloat(amount))) {
      return;
    }
    
    const adjustmentData: AdjustmentData = {
      employeeId,
      compensationType: activeTab,
      amount: parseFloat(amount),
      description: note || `${isAddition ? 'Added' : 'Deducted'} ${activeTab} adjustment`,
      isAddition
    };
    
    try {
      await addAdjustment.mutateAsync({
        payRunId,
        adjustment: adjustmentData
      });
      
      resetForm();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error adding adjustment:", error);
    }
  };
  
  // Get descriptive text based on the active tab
  const getTabDescription = () => {
    switch (activeTab) {
      case 'wages':
        return "Pay out hourly pay and overtime earned";
      case 'commissions':
        return "Pay out commissions earned on services, products, gift cards, and memberships";
      case 'tips':
        return "Pay out tips given by clients";
      case 'other':
        return "Deduct fees and pay out other adjustments";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adjustments for {employeeName}</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="wages">Wages</TabsTrigger>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
            <TabsTrigger value="tips">Tips</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>
          
          <div className="mt-4 text-sm text-muted-foreground">
            {getTabDescription()}
          </div>
          
          <div className="mt-6">
            <label className="block text-sm font-medium mb-2">
              Amount
            </label>
            <div className="flex items-center">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  ₹
                </span>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-6"
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                  min="0"
                />
              </div>
              
              <div className="flex ml-2 gap-2">
                <Button
                  type="button"
                  variant={isAddition ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsAddition(true)}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
                <Button
                  type="button"
                  variant={!isAddition ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsAddition(false)}
                >
                  <Minus className="h-4 w-4 mr-1" /> Deduct
                </Button>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setNote(note ? "" : " ")}
            >
              <FileText className="h-4 w-4 mr-2" />
              Add note
            </Button>
            
            {note !== "" && (
              <div className="mt-2">
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note for this adjustment"
                  className="min-h-[100px]"
                />
              </div>
            )}
          </div>
          
          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!amount || isNaN(parseFloat(amount)) || addAdjustment.isPending}
            >
              {addAdjustment.isPending ? (
                <>
                  <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Apply'
              )}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
