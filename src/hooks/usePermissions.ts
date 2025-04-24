import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Define types for section access permissions
export type SectionPermission = 
  | 'staff'
  | 'services'
  | 'packages'
  | 'inventory'
  | 'locations'
  | 'appointments'
  | 'reports'
  | 'sales'
  | 'settings';

// Function to check if the current user has access to specific sections
export function usePermissions() {
  const [employmentTypeId, setEmploymentTypeId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);

  // Fetch the current user session
  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUserId(data.session.user.id);
      } else {
        setUserId(null);
      }
    };

    fetchSession();
    
    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUserId(session?.user?.id || null);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // First check if user has admin role in profiles table
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['user-role', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();
          
        if (error) {
          console.error('Error fetching user profile:', error);
          return null;
        }
        
        // If role is admin, set isAdminUser to true
        if (data?.role === 'admin') {
          console.log('Admin user detected via profiles table');
          setIsAdminUser(true);
        }
        
        return data;
      } catch (err) {
        console.error('Unexpected error in profile data fetch:', err);
        return null;
      }
    },
    enabled: !!userId,
  });

  // Only fetch employee data if user is not admin from profiles
  const { data: employeeData, isLoading: employeeLoading } = useQuery({
    queryKey: ['employee-permissions', userId, isAdminUser],
    queryFn: async () => {
      if (!userId || isAdminUser) return null; // Skip if already identified as admin
      
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('employment_type_id, employment_type')
          .eq('auth_id', userId)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching employee data:', error);
          return null;
        }
        
        // Check if user is admin based on employment_type string
        if (data?.employment_type === 'Admin') {
          console.log('Admin user detected via employment_type');
          setIsAdminUser(true);
        }
        
        setEmploymentTypeId(data?.employment_type_id || null);
        return data;
      } catch (err) {
        console.error('Unexpected error in employee data fetch:', err);
        return null;
      }
    },
    enabled: !!userId && !isAdminUser && !profileLoading,
  });

  // Fetch the employment type permissions only if user is not admin
  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['employment-type-permissions', employmentTypeId, employeeData?.employment_type, isAdminUser],
    queryFn: async () => {
      // If already determined to be admin, return all permissions indicator
      if (isAdminUser) {
        console.log('Admin user, returning all permissions');
        return '*' as unknown as SectionPermission[];
      }
      
      // If we have an employment_type_id, use that to fetch permissions
      if (employmentTypeId) {
        try {
          const { data, error } = await supabase
            .from('employment_types')
            .select('permissions, name, is_configurable')
            .eq('id', employmentTypeId)
            .maybeSingle();
            
          if (error) {
            console.error('Error fetching permissions:', error);
            return [];
          }
          
          if (!data) return []; // No employment type found
          
          // Admin roles implicitly have all permissions
          if (data.name === 'Admin' || !data.is_configurable) {
            console.log('Admin user detected via employment_type_id');
            setIsAdminUser(true);
            return '*' as unknown as SectionPermission[]; // Special value indicating all sections
          }
          
          return data.permissions as SectionPermission[];
        } catch (err) {
          console.error('Unexpected error in permissions fetch:', err);
          return [];
        }
      } 
      // Fallback to employment_type string-based permissions if employment_type_id is not set
      else if (employeeData?.employment_type) {
        // Hard-coded legacy permissions based on employment_type
        if (employeeData.employment_type === 'stylist') {
          return ['appointments', 'services', 'packages'] as SectionPermission[];
        } else if (employeeData.employment_type === 'operations') {
          return ['appointments', 'inventory'] as SectionPermission[];
        }
      }
      
      return [] as SectionPermission[];
    },
    enabled: (!!employmentTypeId || !!employeeData?.employment_type || isAdminUser) && !employeeLoading,
  });

  // Update loading state when all queries finish
  useEffect(() => {
    if (!profileLoading && (!employeeLoading || isAdminUser) && (!permissionsLoading || isAdminUser)) {
      setLoading(false);
    }
  }, [profileLoading, employeeLoading, permissionsLoading, isAdminUser]);

  // Function to check if user has access to a section
  const hasAccess = (section: SectionPermission): boolean => {
    // Admin users always have access to everything - immediate true
    if (isAdminUser) {
      return true;
    }
    
    // Loading state - deny access until we know
    if (loading) return false;
    
    // No user - deny access
    if (!userId) return false;
    
    // Special all permissions indicator
    if (permissions === '*') return true;
    
    // Check if the section exists in the permissions array
    return permissions.includes(section);
  };

  return {
    hasAccess,
    loading,
    isAdmin: isAdminUser
  };
}