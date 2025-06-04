import React from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ServicePage = {
  data: any[];
  nextPage: number | null;
};

export function useServicesQuery({
  locationId,
  selectedCategory,
  searchQuery,
  pageSize = 10,
}: {
  locationId?: string;
  selectedCategory: string | null;
  searchQuery: string;
  pageSize?: number;
}) {
  // Track if a query is already in progress
  const isQueryingRef = React.useRef<boolean>(false);
  
  return useInfiniteQuery({
    queryKey: ["services", locationId, selectedCategory, searchQuery],
    queryFn: async ({ pageParam = 0 }) => {
      // Only log if it's a new page (not a refetch of an existing page)
      if (!isQueryingRef.current) {
        console.log(`Fetching services page ${pageParam}, location=${locationId}, category=${selectedCategory}, search=${searchQuery}`);
        isQueryingRef.current = true;
      }
      
      const page = pageParam as number;
      let query = supabase
        .from("services")
        .select(
          `
          *,
          services_categories!inner(
            categories(id, name)
          )
        `
        )
        .eq("status", "active")
        .order("name")
        .range(
          page * pageSize,
          page * pageSize + pageSize - 1
        );

      // Apply search filter if query exists
      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      // Apply category filter if selected
      if (selectedCategory) {
        const { data: categoryServices, error: categoryError } = await supabase
          .from("services_categories")
          .select("service_id")
          .eq("category_id", selectedCategory);

        if (categoryError) throw categoryError;

        if (categoryServices && categoryServices.length > 0) {
          const serviceIds = categoryServices.map((cs) => cs.service_id);
          query = query.in("id", serviceIds);
        } else {
          // If no services in this category, return empty array
          return {
            data: [],
            nextPage: null,
          };
        }
      }

      if (locationId) {
        // Get services associated with this location
        const { data: serviceLocations, error: serviceLocationsError } =
          await supabase
            .from("service_locations")
            .select("service_id")
            .eq("location_id", locationId);

        if (serviceLocationsError) throw serviceLocationsError;

        // If we have service locations, filter by them
        if (serviceLocations && serviceLocations.length > 0) {
          const serviceIds = serviceLocations.map((sl) => sl.service_id);
          query = query.in("id", serviceIds);
        }
      }      const { data, error } = await query;
      
      // Reset the querying flag when done
      isQueryingRef.current = false;

      if (error) throw error;

      // Calculate if there's a next page
      const hasMore = data && data.length === pageSize;
      
      return {
        data: data || [],
        nextPage: hasMore ? page + 1 : null,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: false, // Don't refetch when component mounts
    refetchInterval: false, // Don't periodically refetch
  });
}

export function usePackagesQuery({
  locationId,
  searchQuery,
}: {
  locationId?: string;
  searchQuery: string;
}) {
  // Track if a query is already in progress
  const isQueryingRef = React.useRef<boolean>(false);
  
  return useQuery({
    queryKey: ["packages", locationId, searchQuery],
    queryFn: async () => {
      // Only log if it's a new query (not a refetch)
      if (!isQueryingRef.current) {
        console.log(`Fetching packages, location=${locationId}, search=${searchQuery}`);
        isQueryingRef.current = true;
      }
      
      let query = supabase
        .from("packages")
        .select(
          `
          *,
          package_services(
            service:services(*),
            package_selling_price
          )
        `
        )
        .eq("status", "active");

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      const { data, error } = await query;
      
      // Reset the querying flag when done
      isQueryingRef.current = false;
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch when component mounts
    refetchInterval: false, // Don't periodically refetch
  });
}
