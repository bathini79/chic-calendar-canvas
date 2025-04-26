import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { generateBillPDF } from '@/app/api/bills/[id]/download/route';
import { saveAs } from 'file-saver';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';

// Define styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica'
  },
  header: {
    marginBottom: 30
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 10
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5
  },
  businessInfo: {
    fontSize: 10,
    color: '#666'
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10
  },
  invoiceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottom: '1px solid #eee',
    paddingBottom: 10
  },
  customerInfo: {
    width: '50%'
  },
  dateInfo: {
    width: '50%',
    textAlign: 'right'
  },
  table: {
    marginBottom: 20
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    padding: 8,
    fontWeight: 'bold',
    fontSize: 10
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderBottomStyle: 'solid',
    padding: 8,
    fontSize: 10
  },
  col1: {
    width: '40%'
  },
  col2: {
    width: '15%'
  },
  col3: {
    width: '20%'
  },
  col4: {
    width: '25%',
    textAlign: 'right'
  },
  summary: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    borderTopStyle: 'solid',
    paddingTop: 10
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    fontSize: 10
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    borderTopStyle: 'solid',
    paddingTop: 5,
    fontWeight: 'bold'
  },
  footer: {
    marginTop: 40,
    textAlign: 'center',
    fontSize: 10,
    color: '#999'
  }
});

// Bill PDF Component
interface BillPDFProps {
  appointment: any;
  business: any;
  location: any;
}

export const BillPDF: React.FC<BillPDFProps> = ({ appointment, business, location }) => {
  // Calculate totals and format date
  const formattedDate = appointment?.start_time ? format(new Date(appointment.start_time), 'dd MMM yyyy, hh:mm a') : '';
  const billNumber = appointment?.id ? appointment.id.slice(0, 8).toUpperCase() : '';
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with logo and business info */}
        <View style={styles.header}>
          {business?.logo_url && (
            <Image style={styles.logo} src={business.logo_url} />
          )}
          <Text style={styles.title}>{business?.name || 'Chic Calendar Canvas'}</Text>
          <Text style={styles.businessInfo}>
            {location?.name}{location?.address ? `, ${location.address}` : ''}{location?.city ? `, ${location.city}` : ''}
            {location?.state ? `, ${location.state}` : ''}{location?.zip_code ? ` - ${location.zip_code}` : ''}
            {business?.phone && `\nPhone: ${business.phone}`}
            {business?.email && `\nEmail: ${business.email}`}
          </Text>
        </View>
        
        {/* Invoice info and customer details */}
        <View style={styles.invoiceInfo}>
          <View style={styles.customerInfo}>
            <Text style={styles.sectionTitle}>Bill To:</Text>
            <Text>{appointment?.customer?.full_name || 'Guest Customer'}</Text>
            <Text>{appointment?.customer?.phone_number || ''}</Text>
            <Text>{appointment?.customer?.email || ''}</Text>
          </View>
          <View style={styles.dateInfo}>
            <Text>Invoice #: {billNumber}</Text>
            <Text>Date: {formattedDate}</Text>
            <Text>Status: PAID</Text>
            <Text>Payment Method: {appointment?.payment_method || 'Unknown'}</Text>
          </View>
        </View>
        
        {/* Services table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Service</Text>
              <Text style={styles.col2}>Duration</Text>
              <Text style={styles.col3}>Stylist</Text>
              <Text style={styles.col4}>Price</Text>
            </View>
            
            {appointment?.bookings?.map((booking, index) => {
              const name = booking.service?.name || booking.package?.name || 'Service';
              const duration = booking.service?.duration || booking.package?.duration || 0;
              const formattedDuration = `${Math.floor(duration / 60)}h ${duration % 60}m`;
              const stylist = booking.employee?.name || 'Any stylist';
              const price = booking.price_paid || 0;
              
              return (
                <View style={styles.tableRow} key={index}>
                  <Text style={styles.col1}>{name}</Text>
                  <Text style={styles.col2}>{formattedDuration}</Text>
                  <Text style={styles.col3}>{stylist}</Text>
                  <Text style={styles.col4}>₹{price.toFixed(2)}</Text>
                </View>
              );
            })}
          </View>
        </View>
        
        {/* Summary section */}
        <View style={styles.summary}>
          {/* Always use the exact subtotal value from the API */}
          <View style={styles.summaryRow}>
            <Text>Subtotal</Text>
            <Text>₹{typeof appointment?.subtotal === 'number' ? appointment.subtotal.toFixed(2) : '0.00'}</Text>
          </View>
          
          {appointment?.tax_amount > 0 && (
            <View style={styles.summaryRow}>
              <Text>{appointment.tax_name ? `Tax (${appointment.tax_name})` : 'Tax'}</Text>
              <Text>₹{appointment.tax_amount.toFixed(2)}</Text>
            </View>
          )}
          
          {appointment?.membership_discount > 0 && appointment?.membership_name && (
            <View style={styles.summaryRow}>
              <Text>{appointment.membership_name} Discount</Text>
              <Text>-₹{appointment.membership_discount.toFixed(2)}</Text>
            </View>
          )}
          
          {appointment?.coupon_code && appointment?.coupon_discount > 0 && (
            <View style={styles.summaryRow}>
              <Text>Coupon: {appointment.coupon_code}</Text>
              <Text>-₹{appointment.coupon_discount.toFixed(2)}</Text>
            </View>
          )}
          
          {appointment?.points_value > 0 && (
            <View style={styles.summaryRow}>
              <Text>Loyalty Points Redeemed ({appointment.points_redeemed} pts)</Text>
              <Text>-₹{(appointment.points_value || 0).toFixed(2)}</Text>
            </View>
          )}
          
          {appointment?.discount_value > 0 && (
            <View style={styles.summaryRow}>
              <Text>
                {appointment.discount_type === 'percentage' 
                  ? `Discount (${appointment.discount_value}%)` 
                  : `Discount (₹${appointment.discount_value.toFixed(2)})`}
              </Text>
              <Text>
                {appointment.discount_type === 'percentage' 
                  ? `-₹${((appointment?.subtotal || 0) * (appointment.discount_value / 100)).toFixed(2)}`
                  : `-₹${appointment.discount_value.toFixed(2)}`}
              </Text>
            </View>
          )}
          
          {appointment?.round_off_difference && (
            <View style={styles.summaryRow}>
              <Text>Round off</Text>
              <Text>₹{appointment.round_off_difference.toFixed(2)}</Text>
            </View>
          )}
          
          <View style={styles.summaryTotal}>
            <Text>Total</Text>
            <Text>₹{(appointment?.total_price || 0).toFixed(2)}</Text>
          </View>
        </View>
        
        {/* Payment Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          <View style={styles.summaryRow}>
            <Text>Paid with</Text>
            <Text className="capitalize">
              {appointment?.payment_method === 'cash' ? 'Cash' : 
               appointment?.payment_method === 'card' ? 'Card' : 
               appointment?.payment_method === 'online' ? 'Online' : 
               appointment?.payment_method || 'Unknown'}
            </Text>
          </View>
          
          {(appointment?.points_earned > 0) && (
            <View style={styles.summaryRow}>
              <Text>Points Earned</Text>
              <Text>+{appointment.points_earned}</Text>
            </View>
          )}
        </View>
        
        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thank you for your business!</Text>
          {business?.website && <Text>Visit us at: {business.website}</Text>}
        </View>
      </Page>
    </Document>
  );
};

// Bill Generator Component
interface BillGeneratorProps {
  appointmentId: string;
  onBillGenerated: (data: any) => void;
}

export const BillGenerator: React.FC<BillGeneratorProps> = ({ appointmentId, onBillGenerated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchBillData = async () => {
      if (!appointmentId) {
        setError('No appointment ID provided');
        return;
      }
      
      try {
        // Fetch appointment details
        const { data: appointmentData, error: appointmentError } = await supabase
          .from('appointments')
          .select(`
            *,
            customer:profiles(*),
            bookings (
              *,
              service:services(*),
              package:packages(*),
              employee:employees!bookings_employee_id_fkey(*)
            )
          `)
          .eq('id', appointmentId)
          .single();
        
        if (appointmentError) throw appointmentError;
        
        // Fetch location details
        let locationData = null;
        if (appointmentData.location) {
          const { data: locData, error: locError } = await supabase
            .from('locations')
            .select('*')
            .eq('id', appointmentData.location)
            .single();
          
          if (locError) console.error('Error fetching location:', locError);
          else locationData = locData;
        }
        
        // Fetch business details
        const { data: businessData, error: businessError } = await supabase
          .from('business_details')
          .select('*')
          .single();
        
        if (businessError) console.error('Error fetching business details:', businessError);
        
        // Call onBillGenerated callback if provided
        if (onBillGenerated) {
          onBillGenerated({
            appointment: appointmentData,
            location: locationData,
            business: businessData
          });
        }
      } catch (error) {
        console.error('Error fetching bill data:', error);
        setError(error.message || 'Failed to fetch bill data');
      }
    };
    
    fetchBillData();
  }, [appointmentId, onBillGenerated]);
  
  const handleDownload = async () => {
    if (!appointmentId) {
      setError('No appointment ID provided');
      return;
    }
    
    try {
      setLoading(true);
      
      const { blob, filename, error } = await generateBillPDF(appointmentId);
      
      if (error || !blob) {
        throw new Error(error || 'Failed to generate bill');
      }
      
      // Direct download using file-saver
      saveAs(blob, filename);
      
    } catch (error) {
      console.error('Error downloading bill:', error);
      setError(error.message || 'Failed to download bill');
    } finally {
      setLoading(false);
    }
  };
  
  if (error) {
    return <div>Error: {error}</div>;
  }
  
  return (
    <div 
      onClick={handleDownload} 
      className="flex items-center gap-2 cursor-pointer"
    >
      {loading ? 'Generating...' : 'Download Invoice'}
      <Download className="h-4 w-4" />
    </div>
  );
};

export default BillGenerator;