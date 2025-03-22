
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SelectCustomer } from "@/components/admin/bookings/components/SelectCustomer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Search, Tag, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatPrice } from "@/lib/utils";
import { useTaxRates } from "@/hooks/use-tax-rates";

interface MembershipSaleProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MembershipSale({ isOpen, onClose }: MembershipSaleProps) {
  // States
  const [screen, setScreen] = useState<"selection" | "summary">("selection");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [memberships, setMemberships] = useState<any[]>([]);
  const [selectedMembership, setSelectedMembership] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");
  const [saleData, setSaleData] = useState<any | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const { taxRates } = useTaxRates();
  const [selectedTaxRate, setSelectedTaxRate] = useState<any | null>(null);
  const [taxAmount, setTaxAmount] = useState(0);

  // Fetch memberships
  useEffect(() => {
    fetchMemberships();
    fetchLocations();
  }, []);

  // Calculate tax amount when membership or tax rate changes
  useEffect(() => {
    if (selectedMembership && selectedTaxRate) {
      const basePrice = parseFloat(selectedMembership.price) || 0;
      const taxAmountValue = (basePrice * selectedTaxRate.percentage) / 100;
      setTaxAmount(taxAmountValue);
    } else {
      setTaxAmount(0);
    }
  }, [selectedMembership, selectedTaxRate]);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("is_active", true);
        
      if (error) throw error;
      setLocations(data || []);
      if (data && data.length > 0) {
        setSelectedLocation(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
      toast.error("Failed to load locations");
    }
  };

  const fetchMemberships = async () => {
    try {
      const { data, error } = await supabase
        .from("memberships")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      setMemberships(data || []);
    } catch (error) {
      console.error("Error fetching memberships:", error);
      toast.error("Failed to load memberships");
    }
  };

  const handleMembershipSelect = (membership: any) => {
    setSelectedMembership(membership);
    // Set default tax rate if available
    if (taxRates.length > 0) {
      setSelectedTaxRate(taxRates[0]);
    }
  };

  const handlePayNow = async () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }
    
    if (!selectedMembership) {
      toast.error("Please select a membership");
      return;
    }

    if (!selectedLocation) {
      toast.error("Please select a location");
      return;
    }

    try {
      // Create a new sale record
      const saleData = {
        customer_id: selectedCustomer.id,
        membership_id: selectedMembership.id,
        location_id: selectedLocation,
        amount: selectedMembership.price,
        tax_rate_id: selectedTaxRate?.id || null,
        tax_amount: taxAmount,
        total_amount: parseFloat(selectedMembership.price) + taxAmount,
        payment_method: paymentMethod,
        sale_date: new Date().toISOString(),
        status: "completed"
      };

      const { data, error } = await supabase
        .from("membership_sales")
        .insert(saleData)
        .select()
        .single();
        
      if (error) throw error;
      
      // Update customer's membership status
      const customerUpdate = {
        membership_id: selectedMembership.id,
        membership_start_date: new Date().toISOString(),
        membership_end_date: selectedMembership.duration_days 
          ? new Date(Date.now() + selectedMembership.duration_days * 24 * 60 * 60 * 1000).toISOString() 
          : null
      };
      
      const { error: customerError } = await supabase
        .from("profiles")
        .update(customerUpdate)
        .eq("id", selectedCustomer.id);
        
      if (customerError) throw customerError;
      
      // Show success message and switch to summary screen
      toast.success("Membership sold successfully!");
      setSaleData(data);
      setScreen("summary");
    } catch (error) {
      console.error("Error processing sale:", error);
      toast.error("Failed to process the sale");
    }
  };

  const handleClose = () => {
    setScreen("selection");
    setSelectedCustomer(null);
    setSelectedMembership(null);
    setSelectedTaxRate(null);
    setSaleData(null);
    setSearchTerm("");
    onClose();
  };

  const filteredMemberships = memberships.filter(membership => 
    membership.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    membership.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      className={`fixed top-0 right-0 w-full max-w-6xl h-full bg-white z-50 transform transition-transform duration-300 ease-in-out shadow-xl ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex flex-col h-full">
        <div className="p-6 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              {screen === "selection" ? "New Membership Sale" : "Sale Summary"}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>

        {screen === "selection" ? (
          <div className="flex flex-1 min-h-0">
            <div className="w-[30%] border-r">
              <SelectCustomer
                selectedCustomer={selectedCustomer}
                setSelectedCustomer={setSelectedCustomer}
                setShowCreateForm={() => {}}
              />
            </div>

            <div className="w-[70%] flex flex-col h-full">
              <div className="p-6 border-b">
                <div className="flex items-center mb-4">
                  <Tag className="h-5 w-5 mr-2" />
                  <h3 className="text-lg font-semibold">Memberships</h3>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search memberships..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <ScrollArea className="flex-1 p-6">
                <div className="space-y-4">
                  {filteredMemberships.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No memberships found
                    </div>
                  ) : (
                    filteredMemberships.map(membership => (
                      <div
                        key={membership.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedMembership?.id === membership.id
                            ? "border-primary bg-primary-foreground"
                            : "hover:bg-accent"
                        }`}
                        onClick={() => handleMembershipSelect(membership)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{membership.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {membership.description || "No description"}
                            </p>
                            <div className="mt-2">
                              <span className="text-sm">
                                Duration: {membership.duration_days} days
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold">
                              {formatPrice(membership.price)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {selectedMembership && (
                <div className="p-6 border-t">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Location</label>
                        <Select
                          value={selectedLocation}
                          onValueChange={setSelectedLocation}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.map(location => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Payment Method</label>
                        <Select
                          value={paymentMethod}
                          onValueChange={(value: "cash" | "online") => setPaymentMethod(value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Tax Rate</label>
                      <Select
                        value={selectedTaxRate?.id || ""}
                        onValueChange={(value) => {
                          const taxRate = taxRates.find(t => t.id === value) || null;
                          setSelectedTaxRate(taxRate);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select tax rate" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No Tax</SelectItem>
                          {taxRates.map(tax => (
                            <SelectItem key={tax.id} value={tax.id}>
                              {tax.name} ({tax.percentage}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatPrice(selectedMembership.price)}</span>
                      </div>
                      {selectedTaxRate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Tax ({selectedTaxRate.percentage}%)
                          </span>
                          <span>{formatPrice(taxAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>
                          {formatPrice(parseFloat(selectedMembership.price) + taxAmount)}
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      className="w-full"
                      onClick={handlePayNow}
                      disabled={!selectedCustomer || !selectedMembership || !selectedLocation}
                    >
                      Pay Now
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full p-6">
            <div className="bg-primary/10 rounded-lg p-6 mb-8 flex items-center">
              <CheckCircle className="h-10 w-10 text-primary mr-4" />
              <div>
                <h3 className="text-xl font-semibold">Sale Completed</h3>
                <p className="text-muted-foreground">
                  Payment received: {formatPrice(saleData?.total_amount || 0)}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold mb-4 text-lg">Sale Details</h4>
                <div className="space-y-4 border rounded-lg p-4">
                  <div>
                    <span className="text-muted-foreground block">Membership</span>
                    <span className="font-medium">{selectedMembership?.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Sale Date</span>
                    <span className="font-medium">
                      {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Location</span>
                    <span className="font-medium">
                      {locations.find(l => l.id === selectedLocation)?.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Payment Method</span>
                    <span className="font-medium capitalize">{paymentMethod}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4 text-lg">Customer Details</h4>
                <div className="space-y-4 border rounded-lg p-4">
                  <div>
                    <span className="text-muted-foreground block">Name</span>
                    <span className="font-medium">{selectedCustomer?.full_name}</span>
                  </div>
                  {selectedCustomer?.email && (
                    <div>
                      <span className="text-muted-foreground block">Email</span>
                      <span className="font-medium">{selectedCustomer.email}</span>
                    </div>
                  )}
                  {selectedCustomer?.phone && (
                    <div>
                      <span className="text-muted-foreground block">Phone</span>
                      <span className="font-medium">{selectedCustomer.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg p-4 mt-8">
              <h4 className="font-semibold mb-4">Payment Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(selectedMembership?.price || 0)}</span>
                </div>
                {selectedTaxRate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {selectedTaxRate.name} ({selectedTaxRate.percentage}%)
                    </span>
                    <span>{formatPrice(taxAmount)}</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatPrice(saleData?.total_amount || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-auto pt-6 flex justify-end gap-4">
              <Button variant="outline" onClick={handleClose}>Close</Button>
              <Button onClick={() => {
                setScreen("selection");
                setSelectedCustomer(null);
                setSelectedMembership(null);
                setSelectedTaxRate(null);
                setSaleData(null);
                setSearchTerm("");
              }}>New Sale</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
