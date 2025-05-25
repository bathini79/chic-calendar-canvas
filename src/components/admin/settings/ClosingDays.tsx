import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { CalendarIcon, LoaderCircle, Trash } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Define interfaces for type safety
interface Location {
  id: string;
  name: string;
}

interface ClosedPeriod {
  id: string;
  start_date: string;
  end_date: string;
  description: string;
  closed_periods_locations: { location_id: string }[];
  created_at: string;
}

export default function ClosingDays() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [description, setDescription] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [closedPeriods, setClosedPeriods] = useState<ClosedPeriod[]>([]);
  const [allLocations, setAllLocations] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [
          { data: locs, error: locError },
          { data: periods, error: periodError },
        ] = await Promise.all([
          supabase.from("locations").select("id, name").order("name"),
          (supabase as any)
            .from("closed_periods")
            .select("*, closed_periods_locations(location_id), created_at")
            .order("start_date", { ascending: false }),
        ]);
        if (locError) throw locError;
        if (periodError) throw periodError;
        setLocations(locs || []);
        setClosedPeriods(periods || []);
      } catch (err: any) {
        toast({
          title: "Error",
          description: "Failed to load data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (dialogOpen) resetForm();
  }, [dialogOpen]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!startDate) newErrors.startDate = "Start date is required";
    if (!endDate) newErrors.endDate = "End date is required";
    if (startDate && endDate && startDate > endDate)
      newErrors.dateRange = "Start date must be before end date";
    if (!description.trim()) newErrors.description = "Description is required";
    if (!allLocations && selectedLocations.length === 0)
      newErrors.locations = "Select at least one location";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const { data: inserted, error } = await supabase
        .from("closed_periods")
        .insert({
          start_date: startDate!.toISOString().split("T")[0],
          end_date: endDate!.toISOString().split("T")[0],
          description,
        })
        .select()
        .single();

      if (error) throw error;

      const periodId = inserted.id;
      const locationIds = allLocations
        ? locations.map((l) => l.id)
        : selectedLocations;

      if (locationIds.length) {
        const inserts = locationIds.map((lid) => ({
          closed_period_id: periodId,
          location_id: lid,
        }));
        const { error: locInsertErr } = await supabase
          .from("closed_periods_locations")
          .insert(inserts);
        if (locInsertErr) throw locInsertErr;
      }

      const { data: updated, error: fetchError } = await supabase
        .from("closed_periods")
        .select("*, closed_periods_locations(location_id)")
        .order("start_date", { ascending: false });
      if (fetchError) throw fetchError;
      setClosedPeriods(updated || []);
      setDialogOpen(false);
      toast({ title: "Success", description: "Closed period added." });
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to add closed period. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStartDate(null);
    setEndDate(null);
    setDescription("");
    setSelectedLocations([]);
    setAllLocations(false);
    setErrors({});
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
      const { error } = await supabase
        .from("closed_periods")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setClosedPeriods((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Success", description: "Closed period deleted." });
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to delete closed period. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };
  return (
    <div className="container">
      {/* Mobile Header */}
      <div className="lg:hidden px-4 py-4 border-b bg-background sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">Closed Periods</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="whitespace-nowrap">
                Add
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Manage business closure periods
        </p>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:flex justify-between items-center py-8 px-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Closed Periods</h1>
          <p className="text-sm text-muted-foreground">
            Set closed periods for specific locations or your entire business.{" "}
            <a href="#" className="text-primary hover:underline">
              Learn more
            </a>
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              Add Period
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-md sm:max-w-2xl mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                Add Closed Period
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Set the period when your business is closed. Online bookings
                won't be available.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-4 mb-4">
              <div>
                <label className="block mb-1 text-sm sm:text-base">
                  Start date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal text-sm sm:text-base"
                      aria-label="Select start date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Select start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.startDate && (
                  <p className="text-red-500 text-xs sm:text-sm mt-1">
                    {errors.startDate}
                  </p>
                )}
              </div>

              <div>
                <label className="block mb-1 text-sm sm:text-base">
                  End date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal text-sm sm:text-base"
                      aria-label="Select end date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Select end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.endDate && (
                  <p className="text-red-500 text-xs sm:text-sm mt-1">
                    {errors.endDate}
                  </p>
                )}
              </div>
            </div>

            {errors.dateRange && (
              <p className="text-red-500 text-xs sm:text-sm mb-2">
                {errors.dateRange}
              </p>
            )}

            <div className="mb-4">
              <label className="block mb-1 text-sm sm:text-base">
                Description
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-sm sm:text-base"
                aria-label="Description"
              />
              {errors.description && (
                <p className="text-red-500 text-xs sm:text-sm mt-1">
                  {errors.description}
                </p>
              )}
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allLocations}
                  onCheckedChange={(val) => setAllLocations(!!val)}
                  id="all-locations-checkbox"
                />
                <label
                  htmlFor="all-locations-checkbox"
                  className="text-sm sm:text-base"
                >
                  All Locations
                </label>
              </div>

              {!allLocations && (
                <div className="ml-6 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {locations.map((loc) => (
                    <div key={loc.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedLocations.includes(loc.id)}
                        onCheckedChange={(val) => {
                          const isChecked = !!val;
                          setSelectedLocations((prev) =>
                            isChecked
                              ? [...prev, loc.id]
                              : prev.filter((id) => id !== loc.id)
                          );
                        }}
                        id={`location-checkbox-${loc.id}`}
                      />
                      <label
                        htmlFor={`location-checkbox-${loc.id}`}
                        className="text-sm sm:text-base"
                      >
                        {loc.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
              {errors.locations && (
                <p className="text-red-500 text-xs sm:text-sm mt-1">
                  {errors.locations}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setDialogOpen(false)}
                className="text-sm sm:text-base py-2 px-4"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="text-sm sm:text-base py-2 px-4"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="animate-spin mr-2 h-4 w-4" /> Adding...
                  </>
                ) : (
                  "Add"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>      {/* Main Content - Different styles for mobile and desktop */}
      <div className="lg:p-8">
        <div className="rounded-lg border bg-card">
          <div className="p-0 lg:p-6">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <LoaderCircle className="h-8 w-8 animate-spin" />
              </div>
            ) : closedPeriods.length === 0 ? (
              <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center">
                <div className="rounded-full bg-primary/10 p-6">
                  <CalendarIcon className="h-10 w-10 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold tracking-tight">No closed periods</h3>
                  <p className="text-sm text-muted-foreground max-w-[250px] lg:max-w-[400px]">
                    Add closed periods for a single or multiple locations. E.G. Christmas break or a renovation.
                  </p>
                </div>
              </div>
            ) : (          <div className="divide-y divide-border rounded-md border">
            {closedPeriods.map((period) => (
              <div
                key={period.id}
                className="flex items-center justify-between p-4 lg:p-6"
              >
                <div className="space-y-1">
                  <h3 className="font-medium">
                    {period.description}
                  </h3>
                  <div className="flex flex-col lg:flex-row lg:items-center lg:gap-4">
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(period.start_date), "MMM d, yyyy")} –{" "}
                      {format(parseISO(period.end_date), "MMM d, yyyy")}
                    </p>
                    <div className="hidden lg:block text-muted-foreground">•</div>
                    <p className="text-xs lg:text-sm text-muted-foreground">
                      {period.closed_periods_locations?.length === locations.length
                        ? "All locations"
                        : `${period.closed_periods_locations?.length || 0} location(s)`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                  onClick={() => setConfirmDeleteId(period.id)}
                  disabled={isDeleting === period.id}
                  aria-label={`Delete closed period: ${period.description}`}
                >
                  {isDeleting === period.id ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <DialogContent className="w-full max-w-md sm:max-w-lg mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Are you sure?
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              This will permanently delete the closed period. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="secondary"
              onClick={() => setConfirmDeleteId(null)}
              className="text-sm sm:text-base py-2 px-4"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (confirmDeleteId) await handleDelete(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
              disabled={isDeleting !== null}
              className="text-sm sm:text-base py-2 px-4"
            >
              {isDeleting ? (
                <>
                  <LoaderCircle className="animate-spin mr-2 h-4 w-4" /> Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}