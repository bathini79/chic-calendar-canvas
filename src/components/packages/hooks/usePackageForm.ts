
import { useForm } from "react-hook-form";

interface PackageFormData {
  name: string;
  services: string[];
  price: number;
  description: string;
  duration: number;
  is_customizable: boolean;
  status: 'active' | 'inactive';
  discount_type: 'none' | 'percentage' | 'fixed';
  discount_value: number;
  image_urls: string[];
  customizable_services: string[];
}

export const usePackageForm = (initialData?: Partial<PackageFormData>) => {
  const form = useForm<PackageFormData>({
    defaultValues: {
      name: '',
      services: [],
      price: 0,
      description: '',
      duration: 0,
      is_customizable: false,
      status: 'active',
      discount_type: 'none',
      discount_value: 0,
      image_urls: [],
      customizable_services: [],
      ...initialData
    }
  });

  return form;
};
