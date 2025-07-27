import { useState } from "react";
import {
  AlertCircle,
  Plus,
  Trash2
} from "lucide-react";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface CommissionsSectionProps {
  form: any;
  clearSectionError?: (field: string) => void;
  isMobile?: boolean;
}

export function CommissionsSection({
  form,
  clearSectionError,
  isMobile = false,
}: CommissionsSectionProps) {
  const [commissionType, setCommissionType] = useState<string>("flat");

  const handleSlabChange = (
    index: number,
    field: "from" | "to" | "percentage",
    value: string
  ) => {
    const slabs = form.getValues("commission_slabs") || [];
    const updatedSlabs = [...slabs];
    updatedSlabs[index] = { ...updatedSlabs[index], [field]: parseInt(value) || 0 };
    form.setValue("commission_slabs", updatedSlabs, { shouldValidate: true });
  };

  const addSlab = () => {
    const slabs = form.getValues("commission_slabs") || [];
    form.setValue("commission_slabs", [
      ...slabs,
      { from: 0, to: 0, percentage: 0 }
    ], { shouldValidate: true });
  };

  const removeSlab = (index: number) => {
    const slabs = form.getValues("commission_slabs") || [];
    const updatedSlabs = slabs.filter((_: any, i: number) => i !== index);
    form.setValue("commission_slabs", updatedSlabs, { shouldValidate: true });
  };

  return (
    <div className={cn(
      "space-y-6",
      isMobile ? "px-4 pb-20" : "pl-32 pr-8"
    )}>
      <div className={cn(
        "bg-white",
        isMobile ? "space-y-6" : "border rounded-lg p-6 max-w-[680px]"
      )}>
        <h3 className={cn(
          "font-semibold",
          isMobile ? "text-base" : "text-lg mb-4"
        )}>Commission Settings</h3>

        <div className="space-y-6">
          <div className={cn(
            isMobile ? "space-y-6" : "grid gap-4 max-w-[620px]"
          )}>
            <div>
              <div className="space-y-2">
                <Label className={cn(
                  "font-medium",
                  isMobile ? "text-sm" : "text-base"
                )}>Commission Type</Label>
                <Select
                  value={commissionType}
                  onValueChange={(value) => {
                    setCommissionType(value);
                    clearSectionError?.("commission_type");
                  }}
                >
                  <SelectTrigger className={cn(
                    isMobile ? "h-10 text-base" : "h-10"
                  )}>
                    <SelectValue placeholder="Select commission type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat Commission</SelectItem>
                    <SelectItem value="tiered">Tiered Commission</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {commissionType === "flat" && (
              <div>
                <FormField
                  control={form.control}
                  name="flat_commission_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-2">
                        <FormLabel className={cn(
                          "font-medium",
                          isMobile ? "text-sm" : "text-base"
                        )}>Commission Percentage</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Enter commission percentage"
                              {...field}
                              className={cn(
                                "pr-8",
                                isMobile ? "h-10 text-base" : "h-10"
                              )}
                            />
                          </FormControl>
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                            %
                          </span>
                        </div>
                        <FormDescription className={cn(
                          "text-gray-500",
                          isMobile ? "text-xs" : "text-sm"
                        )}>
                          This percentage will be applied to all services
                        </FormDescription>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {commissionType === "tiered" && (
              <div>
                <FormField
                  control={form.control}
                  name="commission_slabs"
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-2">
                        <FormLabel className={cn(
                          "font-medium",
                          isMobile ? "text-sm" : "text-base"
                        )}>Commission Slabs</FormLabel>
                        <div className={cn(
                          "space-y-4",
                          isMobile ? "max-w-full" : "max-w-[620px]"
                        )}>
                          {(field.value || []).map((slab: any, index: number) => (
                            <div
                              key={index}
                              className={cn(
                                "border rounded-lg p-4",
                                isMobile ? "space-y-4" : "grid grid-cols-3 gap-4"
                              )}
                            >
                              <div className="space-y-2">
                                <Label className={cn(
                                  isMobile ? "text-sm" : "text-base"
                                )}>From (₹)</Label>
                                <Input
                                  type="number"
                                  value={slab.from}
                                  onChange={(e) =>
                                    handleSlabChange(index, "from", e.target.value)
                                  }
                                  className={cn(
                                    isMobile ? "h-10 text-base" : "h-10"
                                  )}
                                  placeholder="0"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className={cn(
                                  isMobile ? "text-sm" : "text-base"
                                )}>To (₹)</Label>
                                <Input
                                  type="number"
                                  value={slab.to}
                                  onChange={(e) =>
                                    handleSlabChange(index, "to", e.target.value)
                                  }
                                  className={cn(
                                    isMobile ? "h-10 text-base" : "h-10"
                                  )}
                                  placeholder="10000"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className={cn(
                                  isMobile ? "text-sm" : "text-base"
                                )}>Commission (%)</Label>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    value={slab.percentage}
                                    onChange={(e) =>
                                      handleSlabChange(
                                        index,
                                        "percentage",
                                        e.target.value
                                      )
                                    }
                                    className={cn(
                                      "pr-8",
                                      isMobile ? "h-10 text-base" : "h-10"
                                    )}
                                    placeholder="5"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    %
                                  </span>
                                </div>
                              </div>
                              {index > 0 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "text-red-500 hover:text-red-600",
                                    isMobile ? "-mt-2" : "col-span-3 justify-end"
                                  )}
                                  onClick={() => removeSlab(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="ml-2">Remove Slab</span>
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={addSlab}
                            className={cn(
                              "w-full justify-center",
                              isMobile ? "h-10 text-sm" : "h-10"
                            )}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Commission Slab
                          </Button>
                        </div>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={cn(
        "bg-gray-50 rounded-lg p-4",
        isMobile ? "mx-0" : "max-w-[680px]"
      )}>
        <div className={cn(
          "flex items-start gap-3",
          isMobile ? "flex-col" : "flex-row"
        )}>
          <AlertCircle className={cn(
            "text-blue-500",
            isMobile ? "h-5 w-5" : "h-5 w-5 mt-0.5"
          )} />
          <div className="space-y-1">
            <p className={cn(
              "font-medium text-gray-900",
              isMobile ? "text-sm" : "text-base"
            )}>
              How Commission Works
            </p>
            <p className={cn(
              "text-gray-500",
              isMobile ? "text-xs" : "text-sm"
            )}>
              {commissionType === "flat"
                ? "Flat commission is a fixed percentage applied to all services performed by the staff member."
                : "Tiered commission allows different commission percentages based on service value ranges. Higher value services can have different commission rates."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
