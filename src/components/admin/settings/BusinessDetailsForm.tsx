
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Camera } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BusinessDetails {
  id?: string;
  name: string;
  country: string;
  currency: string;
  phone: string;
  logo_url: string | null;
  facebook_url: string;
  twitter_url: string;
  instagram_url: string;
  website_url: string;
}

export function BusinessDetailsForm() {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [businessDetails, setBusinessDetails] = useState<BusinessDetails>({
    name: "Beauty Salon",
    country: "India",
    currency: "INR",
    phone: "+91 98765 43210",
    logo_url: null,
    facebook_url: "",
    twitter_url: "",
    instagram_url: "",
    website_url: ""
  });

  useEffect(() => {
    const fetchBusinessDetails = async () => {
      try {
        const { data, error } = await supabase
          .from("business_details")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== "PGRST116") { // Not found error is ok for first time
          throw error;
        }

        if (data) {
          setBusinessDetails({
            id: data.id,
            name: data.name || "Beauty Salon",
            country: data.country || "India",
            currency: data.currency || "INR",
            phone: data.phone || "",
            logo_url: data.logo_url,
            facebook_url: data.facebook_url || "",
            twitter_url: data.twitter_url || "",
            instagram_url: data.instagram_url || "",
            website_url: data.website_url || ""
          });
        }
      } catch (error: any) {
        toast.error("Failed to load business details: " + error.message);
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinessDetails();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (businessDetails.id) {
        // Update existing record
        const { error } = await supabase
          .from("business_details")
          .update({
            name: businessDetails.name,
            country: businessDetails.country,
            currency: businessDetails.currency,
            phone: businessDetails.phone,
            logo_url: businessDetails.logo_url,
            facebook_url: businessDetails.facebook_url,
            twitter_url: businessDetails.twitter_url,
            instagram_url: businessDetails.instagram_url,
            website_url: businessDetails.website_url
          })
          .eq("id", businessDetails.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from("business_details")
          .insert([{
            name: businessDetails.name,
            country: businessDetails.country,
            currency: businessDetails.currency,
            phone: businessDetails.phone,
            logo_url: businessDetails.logo_url,
            facebook_url: businessDetails.facebook_url,
            twitter_url: businessDetails.twitter_url,
            instagram_url: businessDetails.instagram_url,
            website_url: businessDetails.website_url
          }]);

        if (error) throw error;
      }

      toast.success("Business details saved successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error("Failed to save business details: " + error.message);
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof BusinessDetails, value: string) => {
    setBusinessDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size should be less than 5MB");
      return;
    }

    try {
      // Use FileReader to handle the image on the client side
      const reader = new FileReader();
      reader.onloadend = () => {
        setBusinessDetails(prev => ({
          ...prev,
          logo_url: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast.error("Failed to upload logo: " + error.message);
      console.error(error);
    }
  };

  const handleRemoveLogo = () => {
    setBusinessDetails(prev => ({
      ...prev,
      logo_url: null
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Business Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center p-8">
            Loading business details...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Business details</CardTitle>
            <CardDescription>
              Set your business name, tax and language preferences, and manage external links.
              <div className="mt-1">
                <a href="#" className="text-primary">Learn more.</a>
              </div>
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Business Info</CardTitle>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>Edit</Button>
          ) : (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-6">
              <div>
                <Label htmlFor="logo">Business Logo</Label>
                <div className="mt-2 flex flex-col items-center gap-4">
                  {businessDetails.logo_url ? (
                    <div className="relative">
                      <img 
                        src={businessDetails.logo_url} 
                        alt="Business Logo" 
                        className="h-24 w-24 object-cover rounded-md" 
                      />
                      <button 
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"
                        type="button"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-24 w-24 bg-muted rounded-md flex items-center justify-center">
                        <Camera className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <span className="text-sm text-muted-foreground">No logo uploaded</span>
                    </div>
                  )}
                  
                  <div className="w-full">
                    <div className="relative">
                      <Input
                        id="logo"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => document.getElementById('logo')?.click()}
                        type="button"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {businessDetails.logo_url ? "Change Logo" : "Upload Logo"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended: PNG or JPG, 512x512 pixels or larger. Max file size 5MB.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={businessDetails.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={businessDetails.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="country">Country</Label>
                <Select 
                  value={businessDetails.country}
                  onValueChange={(value) => handleChange('country', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="India">India</SelectItem>
                    <SelectItem value="USA">USA</SelectItem>
                    <SelectItem value="UK">UK</SelectItem>
                    <SelectItem value="Canada">Canada</SelectItem>
                    <SelectItem value="Australia">Australia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select 
                  value={businessDetails.currency}
                  onValueChange={(value) => handleChange('currency', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {businessDetails.logo_url && (
                <div className="col-span-2 mb-2 flex justify-center md:justify-start">
                  <img 
                    src={businessDetails.logo_url} 
                    alt="Business Logo" 
                    className="h-24 w-24 object-cover rounded-md shadow-md" 
                  />
                </div>
              )}
              
              <div>
                <div className="text-sm text-muted-foreground">Business name</div>
                <div className="font-medium">{businessDetails.name}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Country</div>
                <div className="font-medium">{businessDetails.country}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Currency</div>
                <div className="font-medium">{businessDetails.currency}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Phone Number</div>
                <div className="font-medium">{businessDetails.phone || "Not set"}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>External links</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  value={businessDetails.facebook_url}
                  onChange={(e) => handleChange('facebook_url', e.target.value)}
                  className="mt-1"
                  placeholder="https://facebook.com/yourbusiness"
                />
              </div>

              <div>
                <Label htmlFor="twitter">X (Twitter)</Label>
                <Input
                  id="twitter"
                  value={businessDetails.twitter_url}
                  onChange={(e) => handleChange('twitter_url', e.target.value)}
                  className="mt-1"
                  placeholder="https://twitter.com/yourbusiness"
                />
              </div>

              <div>
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={businessDetails.instagram_url}
                  onChange={(e) => handleChange('instagram_url', e.target.value)}
                  className="mt-1"
                  placeholder="https://instagram.com/yourbusiness"
                />
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={businessDetails.website_url}
                  onChange={(e) => handleChange('website_url', e.target.value)}
                  className="mt-1"
                  placeholder="https://yourbusiness.com"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Facebook</div>
                <div>
                  {businessDetails.facebook_url ? (
                    <a href={businessDetails.facebook_url} target="_blank" rel="noopener noreferrer" className="text-primary">
                      {businessDetails.facebook_url}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">X (Twitter)</div>
                <div>
                  {businessDetails.twitter_url ? (
                    <a href={businessDetails.twitter_url} target="_blank" rel="noopener noreferrer" className="text-primary">
                      {businessDetails.twitter_url}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Instagram</div>
                <div>
                  {businessDetails.instagram_url ? (
                    <a href={businessDetails.instagram_url} target="_blank" rel="noopener noreferrer" className="text-primary">
                      {businessDetails.instagram_url}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Website</div>
                <div>
                  {businessDetails.website_url ? (
                    <a href={businessDetails.website_url} target="_blank" rel="noopener noreferrer" className="text-primary">
                      {businessDetails.website_url}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
