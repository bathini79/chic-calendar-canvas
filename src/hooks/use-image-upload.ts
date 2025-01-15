import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ImageUploadOptions {
  bucket: string;
  maxFiles?: number;
}

export function useImageUpload({ bucket, maxFiles = 5 }: ImageUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadImages = async (files: FileList) => {
    if (!files || files.length === 0) return [];
    if (files.length > maxFiles) {
      toast({
        variant: "destructive",
        title: "Too many files",
        description: `You can only upload up to ${maxFiles} files at once.`,
      });
      return [];
    }

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      toast({
        title: "Success",
        description: "Images uploaded successfully",
      });
      return uploadedUrls;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error uploading images",
        description: error.message,
      });
      return [];
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    uploadImages,
  };
}