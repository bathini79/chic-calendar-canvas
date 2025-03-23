import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useActiveServices } from '../hooks/useActiveServices';
import { useActivePackages } from '../hooks/useActivePackages';
import { useAppointmentState } from '../hooks/useAppointmentState';
import useSaveAppointment from '../hooks/useSaveAppointment';
import { formatPhoneNumber } from '@/lib/utils';
import { toast } from 'sonner';
import { getFinalPrice, calculatePackagePrice, getTotalPrice, getTotalDuration } from '../utils/bookingUtils';
import { Appointment } from '../types';
import { useCustomerMemberships, type CustomerMembership } from '@/hooks/use-customer-memberships';
import { format } from 'date-fns';

// Import other required components
import { SelectCustomer } from '@/components/admin/bookings/components/SelectCustomer';
import { ServiceSelector } from './ServiceSelector';
import { CheckoutSection } from './CheckoutSection';
import { SummaryView } from './SummaryView';

// Define types for component props
interface AppointmentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  selectedTime: string;
  employees: any[];
  existingAppointment?: Appointment | null;
  locationId: string;
}

// Type for a customer
interface Customer {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  created_at: string;
  updated_at: string;
}

export const AppointmentManager: React.FC<AppointmentManagerProps> = ({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  employees,
  existingAppointment,
  locationId
}) => {
  // Services and packages data
  const { data: services = [] } = useActiveServices();
  const { data: packages = [] } = useActivePackages();
  
  // Customer memberships
  const { customerMemberships, fetchCustomerMemberships, isLoading: isMembershipsLoading } = useCustomerMemberships();

  // State for appointment management
  const { 
    state: appointmentState,
    actions: appointmentActions,
    resetState,
    errors,
    setErrors
  } = useAppointmentState();

  const { selectedCustomer, selectedServices, selectedPackages, serviceEmployees, packageEmployees, customizedServices, paymentMethod } = appointmentState;
  const { setCustomerId, setPaymentMethod, addService, removeService, addPackage, removePackage, assignServiceEmployee, assignPackageEmployee, customizePackage } = appointmentActions;

  // State for controlling view
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [appointmentItems, setAppointmentItems] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState({
    type: 'none' as 'none' | 'percentage' | 'fixed',
    value: 0,
    label: '',
    source: ''
  });

  // Use the save appointment hook
  const { handleSaveAppointment, isLoading } = useSaveAppointment({
    selectedDate,
    selectedTime,
    selectedCustomer: customer,
    selectedServices,
    selectedPackages,
    services,
    packages,
    selectedStylists: serviceEmployees,
    getTotalDuration: calculateTotalDuration,
    getTotalPrice: getFinalPriceWithDiscount,
    discountType: appliedDiscount.type,
    discountValue: appliedDiscount.value,
    paymentMethod: paymentMethod || 'cash',
    notes: '',
    customizedServices,
    currentScreen: showSummary ? 'CHECKOUT' : 'BOOKING',
    locationId
  });

  // Calculate total price
  const calculateTotalPrice = () => {
    return getTotalPrice(
      selectedServices,
      selectedPackages,
      services || [],
      packages || [],
      customizedServices
    );
  };

  // Calculate total duration
  const calculateTotalDuration = () => {
    return getTotalDuration(
      selectedServices,
      selectedPackages,
      services || [],
      packages || [],
      customizedServices
    );
  };

  // Get final price with discount
  const getFinalPriceWithDiscount = () => {
    const totalPrice = calculateTotalPrice();
    return getFinalPrice(totalPrice, appliedDiscount.type, appliedDiscount.value);
  };

  // Handle customer selection
  const handleCustomerSelect = async (selectedCustomer: Customer) => {
    setCustomer(selectedCustomer);
    setCustomerId(selectedCustomer.id);

    // Fetch customer's active memberships
    if (selectedCustomer?.id) {
      const memberships = await fetchCustomerMemberships(selectedCustomer.id);
      
      // Check if memberships apply to selected services or packages
      const totalPrice = calculateTotalPrice();
      
      // Check for applicable service discounts
      let bestDiscount = { 
        calculatedDiscount: 0, 
        discountType: 'none' as 'none' | 'percentage' | 'fixed', 
        discountValue: 0,
        membershipName: ''
      };
      
      // Check each service for membership discount
      selectedServices.forEach(serviceId => {
        const servicePrice = services?.find(s => s.id === serviceId)?.selling_price || 0;
        if (servicePrice <= 0) return;
        
        const discount = findBestMembershipDiscount(memberships, serviceId, null, servicePrice);
        if (discount && discount.calculatedDiscount > bestDiscount.calculatedDiscount) {
          bestDiscount = discount;
        }
      });
      
      // Check each package for membership discount
      selectedPackages.forEach(packageId => {
        const pkg = packages?.find(p => p.id === packageId);
        if (!pkg) return;
        
        const packagePrice = calculatePackagePrice(
          pkg,
          customizedServices[packageId] || [],
          services || []
        );
        
        const discount = findBestMembershipDiscount(memberships, null, packageId, packagePrice);
        if (discount && discount.calculatedDiscount > bestDiscount.calculatedDiscount) {
          bestDiscount = discount;
        }
      });
      
      // Apply best membership discount if found
      if (bestDiscount.calculatedDiscount > 0) {
        setAppliedDiscount({
          type: bestDiscount.discountType,
          value: bestDiscount.discountValue,
          label: `${bestDiscount.membershipName} Membership`,
          source: 'membership'
        });
      }
    }
  };

  const findBestMembershipDiscount = (
    memberships: CustomerMembership[],
    serviceId: string | null,
    packageId: string | null,
    price: number
  ) => {
    if (!memberships || memberships.length === 0) return null;
    
    // Find applicable memberships
    const applicable = memberships.filter(mem => {
      if (!mem.membership) return false;
      
      return (
        (serviceId && mem.membership.applicable_services?.includes(serviceId)) ||
        (packageId && mem.membership.applicable_packages?.includes(packageId))
      );
    });
    
    if (applicable.length === 0) return null;
    
    // Find best discount
    let bestDiscount = 0;
    let bestMembership = null;
    
    applicable.forEach(mem => {
      if (!mem.membership) return;
      
      let discountAmount = 0;
      if (mem.membership.discount_type === 'percentage') {
        discountAmount = price * (mem.membership.discount_value / 100);
        
        // Apply max cap if exists
        if (mem.membership.max_discount_value) {
          discountAmount = Math.min(discountAmount, mem.membership.max_discount_value);
        }
      } else {
        discountAmount = Math.min(mem.membership.discount_value, price);
      }
      
      if (discountAmount > bestDiscount) {
        bestDiscount = discountAmount;
        bestMembership = mem;
      }
    });
    
    if (!bestMembership || !bestMembership.membership) return null;
    
    return {
      calculatedDiscount: bestDiscount,
      discountType: bestMembership.membership.discount_type,
      discountValue: bestMembership.membership.discount_value,
      membershipName: bestMembership.membership.name
    };
  };

  // Handle adding a service to the appointment
  const handleAddService = (serviceId: string) => {
    addService(serviceId);
  };

  // Handle adding a package to the appointment
  const handleAddPackage = (packageId: string) => {
    addPackage(packageId);
  };

  // Handle removing a service from the appointment
  const handleRemoveService = (serviceId: string) => {
    removeService(serviceId);
  };

  // Handle removing a package from the appointment
  const handleRemovePackage = (packageId: string) => {
    removePackage(packageId);
  };

  // Handle customized services for a package
  const handleCustomizePackage = (packageId: string, serviceIds: string[]) => {
    customizePackage(packageId, serviceIds);
  };

  // Handle employee assignment
  const handleEmployeeChange = (serviceId: string | null, packageId: string | null, employeeId: string) => {
    if (serviceId) {
      assignServiceEmployee(serviceId, employeeId);
    } else if (packageId) {
      assignPackageEmployee(packageId, employeeId);
    }
  };

  // Handle checkout
  const handleCheckout = async (paymentMethod: 'cash' | 'online') => {
    // Validate required fields
    if (!customer) {
      setErrors({ ...errors, customer: 'Please select a customer' });
      return;
    }

    if (selectedServices.length === 0 && selectedPackages.length === 0) {
      setErrors({ ...errors, services: 'Please select at least one service or package' });
      return;
    }

    // Get booking items for the summary view
    prepareItemsForSummary();
    
    // Update payment information
    setPaymentMethod(paymentMethod);
    
    // Show summary view
    setShowSummary(true);
  };

  // Prepare items for summary view
  const prepareItemsForSummary = () => {
    const items: any[] = [];

    // Add services
    selectedServices.forEach(serviceId => {
      const service = services?.find(s => s.id === serviceId);
      if (service) {
        const employeeId = serviceEmployees[serviceId];
        const employee = employees.find(e => e.id === employeeId);
        
        items.push({
          id: service.id,
          name: service.name,
          price: service.selling_price,
          type: 'service',
          employee: employee ? { id: employee.id, name: employee.name } : undefined,
          duration: service.duration
        });
      }
    });

    // Add packages
    selectedPackages.forEach(packageId => {
      const pkg = packages?.find(p => p.id === packageId);
      if (pkg) {
        const employeeId = packageEmployees[packageId];
        const employee = employees.find(e => e.id === employeeId);
        const customized = customizedServices[packageId] || [];
        
        // Calculate package price with customizations
        const packagePrice = calculatePackagePrice(pkg, customized, services || []);
        
        items.push({
          id: pkg.id,
          name: pkg.name,
          price: packagePrice,
          type: 'package',
          employee: employee ? { id: employee.id, name: employee.name } : undefined,
          duration: pkg.duration,
          customized: customized.length > 0
        });
      }
    });

    setAppointmentItems(items);
  };

  // Handle appointment save
  const handleSaveAppointmentInner = async () => {
    setIsProcessing(true);
    try {
      // Create appointment and bookings data
      const apptData = {
        total: getFinalPriceWithDiscount(),
        discountType: appliedDiscount.type,
        discountValue: appliedDiscount.value,
        taxAmount: 0, // Could add tax calculation logic here
        couponDiscount: 0 // Could add coupon discount logic here
      };

      // Check if this is an existing appointment or a new one
      const appointmentId = await handleSaveAppointment(existingAppointment?.id ? 
        { appointmentId: existingAppointment.id, ...apptData } : 
        apptData
      );
      
      if (appointmentId) {
        toast.success(existingAppointment ? 'Appointment updated successfully' : 'Appointment created successfully');
        resetState();
        setShowSummary(false);
        onClose();
      } else {
        toast.error('Failed to save appointment');
      }
    } catch (error: any) {
      console.error('Error saving appointment:', error);
      toast.error(error.message || 'An error occurred while saving the appointment');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle another appointment
  const handleAddAnother = () => {
    resetState();
    setCustomer(null);
    setShowSummary(false);
    setAppliedDiscount({ type: 'none', value: 0, label: '', source: '' });
  };

  // Handle close
  const handleClose = () => {
    resetState();
    setCustomer(null);
    setShowSummary(false);
    setAppliedDiscount({ type: 'none', value: 0, label: '', source: '' });
    onClose();
  };

  // Initialize with existing appointment data if editing
  useEffect(() => {
    if (existingAppointment && services && packages) {
      // Reset state first
      resetState();
      
      // Set customer info
      if (existingAppointment.customer) {
        const customerData = {
          id: existingAppointment.customer.id,
          full_name: existingAppointment.customer.full_name || '',
          email: existingAppointment.customer.email || '',
          phone_number: existingAppointment.customer.phone_number || '',
          created_at: existingAppointment.customer.created_at || '',
          updated_at: existingAppointment.customer.updated_at || ''
        };
        
        setCustomer(customerData);
        setCustomerId(customerData.id);
        
        // Also fetch customer memberships
        if (existingAppointment.customer.id) {
          fetchCustomerMemberships(existingAppointment.customer.id);
        }
      }
      
      // Set customer ID
      setCustomerId(existingAppointment.customer_id);
      
      // Set payment method
      setPaymentMethod(existingAppointment.payment_method || 'cash');
      
      // Set discount
      if (existingAppointment.discount_type && existingAppointment.discount_type !== 'none') {
        setAppliedDiscount({
          type: existingAppointment.discount_type as 'percentage' | 'fixed',
          value: existingAppointment.discount_value || 0,
          label: 'Applied Discount',
          source: 'manual'
        });
      }
      
      // Set services and packages
      existingAppointment.bookings?.forEach(booking => {
        if (booking.service_id && !booking.package_id) {
          addService(booking.service_id);
          if (booking.employee_id) {
            assignServiceEmployee(booking.service_id, booking.employee_id);
          }
        } else if (booking.package_id) {
          addPackage(booking.package_id);
          if (booking.employee_id) {
            assignPackageEmployee(booking.package_id, booking.employee_id);
          }
          
          // TODO: Handle customized services if needed
        }
      });
    }
  }, [existingAppointment, services, packages, resetState, setCustomerId, setPaymentMethod, addService, assignServiceEmployee, addPackage, assignPackageEmployee, setAppliedDiscount, fetchCustomerMemberships]);

  if (showSummary) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-xl">
          <SummaryView
            appointmentId={existingAppointment?.id || ''}
            customer={customer!}
            totalPrice={getFinalPriceWithDiscount()}
            items={appointmentItems}
            paymentMethod={paymentMethod || 'cash'}
            onAddAnother={handleAddAnother}
            receiptNumber={''} 
            taxAmount={0}
            subTotal={calculateTotalPrice()}
          />
          
          <div className="flex justify-between mt-4">
            <Button variant="outline" onClick={() => setShowSummary(false)}>
              Back
            </Button>
            <Button 
              onClick={handleSaveAppointmentInner} 
              disabled={isProcessing}
            >
              {isProcessing ? 'Saving...' : existingAppointment ? 'Update Appointment' : 'Complete Appointment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left column - Customer selection and service details */}
          <div className="lg:col-span-2 space-y-4">
            {/* Customer selection */}
            <div className="p-4 border rounded-md">
              <h3 className="text-lg font-semibold mb-4">Customer Details</h3>
              
              <SelectCustomer 
                selectedCustomer={customer} 
                onCustomerSelect={handleCustomerSelect}
                error={errors.customer}
              />
              
              {customer && (
                <div className="mt-4 space-y-2">
                  <p>
                    <span className="font-medium">Name:</span> {customer.full_name}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span> {customer.email}
                  </p>
                  {customer.phone_number && (
                    <p>
                      <span className="font-medium">Phone:</span> {formatPhoneNumber(customer.phone_number)}
                    </p>
                  )}
                  {customerMemberships && customerMemberships.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium">Active Memberships:</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {customerMemberships.map(membership => (
                          <span key={membership.id} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {membership.membership?.name} 
                            {membership.end_date && (
                              <> (valid until {format(new Date(membership.end_date), 'dd MMM yyyy')}</>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Service selection */}
            <ServiceSelector
              services={services}
              packages={packages}
              selectedServices={selectedServices}
              selectedPackages={selectedPackages}
              serviceEmployees={serviceEmployees}
              packageEmployees={packageEmployees}
              customizedServices={customizedServices}
              employees={employees}
              onAddService={handleAddService}
              onAddPackage={handleAddPackage}
              onRemoveService={handleRemoveService}
              onRemovePackage={handleRemovePackage}
              onEmployeeChange={handleEmployeeChange}
              onCustomizePackage={handleCustomizePackage}
              error={errors.services}
            />
          </div>
          
          {/* Right column - Appointment summary and checkout */}
          <div className="space-y-4">
            <div className="p-4 border rounded-md">
              <h3 className="text-lg font-semibold mb-4">Appointment Details</h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Time</p>
                  <p className="font-medium">{selectedTime}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-medium">{calculateTotalDuration()} minutes</p>
                </div>
                
                {customerMemberships && customerMemberships.length > 0 && appliedDiscount.source === 'membership' && (
                  <div className="bg-purple-50 p-2 rounded-md">
                    <p className="text-sm font-medium text-purple-800">{appliedDiscount.label} Applied</p>
                    <p className="text-xs text-purple-700">
                      {appliedDiscount.type === 'percentage' 
                        ? `${appliedDiscount.value}% off` 
                        : `₹${appliedDiscount.value} off`}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Checkout section */}
            <CheckoutSection
              subtotal={calculateTotalPrice()}
              discount={{
                type: appliedDiscount.type, 
                value: appliedDiscount.value,
                label: appliedDiscount.label
              }}
              total={getFinalPriceWithDiscount()}
              onCheckout={handleCheckout}
              isDisabled={
                !customer || 
                (selectedServices.length === 0 && selectedPackages.length === 0)
              }
              isLoading={isLoading}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
