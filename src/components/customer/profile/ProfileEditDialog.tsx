
import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  birth_date: string | null;
  gender: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  addresses: any[];
}

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileData;
  onSubmit: (data: Partial<ProfileData>) => Promise<void>;
  onAvatarUpdate: (url: string) => Promise<void>;
}

const formSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  phone_number: z.string().optional(),
  birth_date: z.date().nullable(),
  gender: z.string().nullable(),
  linkedin_url: z.string().url("Please enter a valid URL").nullable().or(z.literal("")),
  twitter_url: z.string().url("Please enter a valid URL").nullable().or(z.literal("")),
  instagram_url: z.string().url("Please enter a valid URL").nullable().or(z.literal("")),
  facebook_url: z.string().url("Please enter a valid URL").nullable().or(z.literal("")),
});

export const ProfileEditDialog = ({
  open,
  onOpenChange,
  profile,
  onSubmit,
  onAvatarUpdate,
}: ProfileEditDialogProps) => {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: profile.full_name || "",
      phone_number: profile.phone_number || "",
      birth_date: profile.birth_date ? new Date(profile.birth_date) : null,
      gender: profile.gender || null,
      linkedin_url: profile.linkedin_url || "",
      twitter_url: profile.twitter_url || "",
      instagram_url: profile.instagram_url || "",
      facebook_url: profile.facebook_url || "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    // Handle avatar upload first if there's a file
    if (avatarFile) {
      await handleAvatarUpload();
    }

    // Then update the rest of the profile
    await onSubmit(values);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAvatarFile(e.target.files[0]);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;

    try {
      setUploading(true);

      // Create a unique file path for the user's avatar
      const fileExt = avatarFile.name.split('.').pop();
      const filePath = `avatars/${profile.id}/${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, avatarFile);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      // Update the profile with the new avatar URL
      await onAvatarUpdate(data.publicUrl);
      
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part.charAt(0))
      .join("")
      .toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center mb-4">
              <div className="mb-4">
                <Avatar className="h-20 w-20">
                  {avatarFile ? (
                    <AvatarImage src={URL.createObjectURL(avatarFile)} />
                  ) : profile.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} />
                  ) : (
                    <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                      {getInitials(profile.full_name)}
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>
              <div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  id="avatar-upload"
                />
                <label htmlFor="avatar-upload">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="cursor-pointer"
                    asChild
                  >
                    <span>Change Picture</span>
                  </Button>
                </label>
              </div>
            </div>

            {/* Personal Information */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <PhoneInput placeholder="Your phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="birth_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Birth</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || uploading}>
                {form.formState.isSubmitting || uploading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
