import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CategoryMultiSelect } from '../categories/CategoryMultiSelect';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';

interface ServiceFormProps {
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ServiceForm({ initialData, onSuccess, onCancel }: ServiceFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [originalPrice, setOriginalPrice] = useState<number>(initialData?.original_price || 0);
  const [sellingPrice, setSellingPrice] = useState<number>(initialData?.selling_price || 0);
  const [duration, setDuration] = useState<number>(initialData?.duration || 30);
  const [gender, setGender] = useState(initialData?.gender || 'all');
  const [status, setStatus] = useState(initialData?.status || 'active');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialData?.categories?.map((cat: any) => cat.id) || []
  );
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Array<{id: string, name: string}>>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  const isEditing = !!initialData?.id;

  useEffect(() => {
    // Fetch locations when component mounts
    fetchLocations();
    
    // If editing an existing service, fetch its assigned locations
    if (isEditing) {
      fetchServiceLocations();
    }
  }, [isEditing]);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .eq('status', 'active');
      
      if (error) throw error;
      
      setLocations(data || []);
      
      // If creating a new service, select all locations by default
      if (!isEditing) {
        setSelectedLocations(data?.map(loc => loc.id) || []);
      }
    } catch (error: any) {
      console.error('Error fetching locations:', error);
      toast.error('Failed to load locations');
    }
  };

  const fetchServiceLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('service_locations')
        .select('location_id')
        .eq('service_id', initialData.id);
      
      if (error) throw error;
      
      setSelectedLocations(data?.map(item => item.location_id) || []);
    } catch (error: any) {
      console.error('Error fetching service locations:', error);
      toast.error('Failed to load service locations');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name) {
      toast.error('Service name is required');
      return;
    }
    
    if (sellingPrice <= 0) {
      toast.error('Selling price must be greater than 0');
      return;
    }
    
    if (duration <= 0) {
      toast.error('Duration must be greater than 0');
      return;
    }

    if (selectedLocations.length === 0) {
      toast.error('Please select at least one location');
      return;
    }
    
    try {
      setLoading(true);
      
      const serviceData = {
        name,
        description,
        original_price: originalPrice,
        selling_price: sellingPrice,
        duration,
        gender,
        status
      };
      
      // Create/update the service record
      let serviceResult;
      if (isEditing) {
        // Update existing service
        serviceResult = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', initialData.id)
          .select();
      } else {
        // Create new service
        serviceResult = await supabase
          .from('services')
          .insert(serviceData)
          .select();
      }
      
      if (serviceResult.error) throw serviceResult.error;
      
      const service = serviceResult.data[0];
      
      // Handle categories
      if (selectedCategories.length > 0) {
        // Remove existing category associations if editing
        if (isEditing) {
          await supabase
            .from('services_categories')
            .delete()
            .eq('service_id', service.id);
        }
        
        // Create category associations
        const categoryRecords = selectedCategories.map(categoryId => ({
          service_id: service.id,
          category_id: categoryId
        }));
        
        const { error: categoriesError } = await supabase
          .from('services_categories')
          .insert(categoryRecords);
        
        if (categoriesError) throw categoriesError;
      }
      
      // Handle locations - first delete existing ones if editing
      if (isEditing) {
        const { error: deleteLocError } = await supabase
          .from('service_locations')
          .delete()
          .eq('service_id', service.id);
        
        if (deleteLocError) throw deleteLocError;
      }
      
      // Insert new location associations
      if (selectedLocations.length > 0) {
        const locationRecords = selectedLocations.map(locId => ({
          service_id: service.id,
          location_id: locId
        }));
        
        const { error: locationsError } = await supabase
          .from('service_locations')
          .insert(locationRecords);
        
        if (locationsError) throw locationsError;
      }
      
      toast.success(`Service ${isEditing ? 'updated' : 'created'} successfully`);
      if (onSuccess) onSuccess();
      
    } catch (error: any) {
      console.error('Error saving service:', error);
      toast.error(error.message || 'Failed to save service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-2">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Service Name</Label>
          <Input
            id="name"
            placeholder="Enter service name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Enter service description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="original-price">Original Price (₹)</Label>
            <Input
              id="original-price"
              type="number"
              min="0"
              placeholder="0.00"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(parseFloat(e.target.value) || 0)}
            />
          </div>
          
          <div>
            <Label htmlFor="selling-price">Selling Price (₹)</Label>
            <Input
              id="selling-price"
              type="number"
              min="0"
              placeholder="0.00"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              placeholder="30"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div>
          <Label>Categories</Label>
          <CategoryMultiSelect 
            selectedCategories={selectedCategories}
            onCategorySelect={handleCategorySelect}
            onCategoryRemove={handleCategoryRemove}
          />
        </div>
        
        <div>
          <Label>Locations</Label>
          <MultiSelect
            options={locations.map(loc => ({ label: loc.name, value: loc.id }))}
            selected={selectedLocations}
            onChange={setSelectedLocations}
            placeholder="Select locations"
            className="w-full"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch 
            id="status" 
            checked={status === 'active'}
            onCheckedChange={(checked) => setStatus(checked ? 'active' : 'inactive')}
          />
          <Label htmlFor="status">Active</Label>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Service'}
        </Button>
      </div>
    </form>
  );
}
