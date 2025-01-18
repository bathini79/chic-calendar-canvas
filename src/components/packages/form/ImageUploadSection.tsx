import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Image, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFormContext } from "react-hook-form";
import { useState } from "react";

interface ImageUploadSectionProps {
  images: string[];
  setImages: (images: string[]) => void;
}

export function ImageUploadSection({ images, setImages }: ImageUploadSectionProps) {
  const [uploading, setUploading] = useState(false);
  const form = useFormContext();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newImages = [...images];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('services')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('services')
          .getPublicUrl(filePath);

        newImages.push(publicUrl);
      }

      setImages(newImages);
      form.setValue('image_urls', newImages);
      toast.success('Images uploaded successfully');
    } catch (error: any) {
      toast.error('Error uploading images');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    form.setValue('image_urls', newImages);
  };

  return (
    <FormField
      control={form.control}
      name="image_urls"
      render={() => (
        <FormItem>
          <FormLabel>Images</FormLabel>
          <FormControl>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                {images.map((url, index) => (
                  <div key={url} className="relative group">
                    <img
                      src={url}
                      alt={`Package image ${index + 1}`}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="relative"
                  disabled={uploading}
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Image className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload Images'}
                </Button>
              </div>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}