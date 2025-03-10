
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface BusinessDetails {
  name: string;
  country: string;
  currency: string;
  phone: string;
  logo: string | null;
  externalLinks: {
    facebook: string;
    twitter: string;
    instagram: string;
    website: string;
  }
}

export function BusinessDetailsForm() {
  const [isEditing, setIsEditing] = useState(false);
  const [businessDetails, setBusinessDetails] = useState<BusinessDetails>({
    name: "Beauty Salon",
    country: "India",
    currency: "INR",
    phone: "+91 98765 43210",
    logo: null,
    externalLinks: {
      facebook: "",
      twitter: "",
      instagram: "",
      website: ""
    }
  });

  const handleSave = () => {
    setIsEditing(false);
    // In a real app, we would save the data to the backend here
  };

  const handleChange = (field: keyof BusinessDetails, value: string) => {
    setBusinessDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExternalLinkChange = (field: keyof typeof businessDetails.externalLinks, value: string) => {
    setBusinessDetails(prev => ({
      ...prev,
      externalLinks: {
        ...prev.externalLinks,
        [field]: value
      }
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, we would upload the file to a storage service
      // and get back a URL to store in businessDetails.logo
      const reader = new FileReader();
      reader.onloadend = () => {
        setBusinessDetails(prev => ({
          ...prev,
          logo: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

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
            <Button onClick={handleSave}>Save</Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="logo">Business Logo</Label>
                <div className="mt-2">
                  {businessDetails.logo && (
                    <div className="mb-2">
                      <img 
                        src={businessDetails.logo} 
                        alt="Business Logo" 
                        className="h-16 w-16 object-cover rounded-md" 
                      />
                    </div>
                  )}
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                  />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {businessDetails.logo && (
                <div className="col-span-2 mb-2">
                  <img 
                    src={businessDetails.logo} 
                    alt="Business Logo" 
                    className="h-16 w-16 object-cover rounded-md" 
                  />
                </div>
              )}
              
              <div>
                <div className="text-sm text-muted-foreground">Business name</div>
                <div>{businessDetails.name}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Country</div>
                <div>{businessDetails.country}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Currency</div>
                <div>{businessDetails.currency}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Phone Number</div>
                <div>{businessDetails.phone}</div>
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
                  value={businessDetails.externalLinks.facebook}
                  onChange={(e) => handleExternalLinkChange('facebook', e.target.value)}
                  className="mt-1"
                  placeholder="https://facebook.com/yourbusiness"
                />
              </div>

              <div>
                <Label htmlFor="twitter">X (Twitter)</Label>
                <Input
                  id="twitter"
                  value={businessDetails.externalLinks.twitter}
                  onChange={(e) => handleExternalLinkChange('twitter', e.target.value)}
                  className="mt-1"
                  placeholder="https://twitter.com/yourbusiness"
                />
              </div>

              <div>
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={businessDetails.externalLinks.instagram}
                  onChange={(e) => handleExternalLinkChange('instagram', e.target.value)}
                  className="mt-1"
                  placeholder="https://instagram.com/yourbusiness"
                />
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={businessDetails.externalLinks.website}
                  onChange={(e) => handleExternalLinkChange('website', e.target.value)}
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
                  {businessDetails.externalLinks.facebook ? (
                    <a href={businessDetails.externalLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-primary">
                      {businessDetails.externalLinks.facebook}
                    </a>
                  ) : (
                    <span className="text-primary cursor-pointer">Add</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">X (Twitter)</div>
                <div>
                  {businessDetails.externalLinks.twitter ? (
                    <a href={businessDetails.externalLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-primary">
                      {businessDetails.externalLinks.twitter}
                    </a>
                  ) : (
                    <span className="text-primary cursor-pointer">Add</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Instagram</div>
                <div>
                  {businessDetails.externalLinks.instagram ? (
                    <a href={businessDetails.externalLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-primary">
                      {businessDetails.externalLinks.instagram}
                    </a>
                  ) : (
                    <span className="text-primary cursor-pointer">Add</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Website</div>
                <div>
                  {businessDetails.externalLinks.website ? (
                    <a href={businessDetails.externalLinks.website} target="_blank" rel="noopener noreferrer" className="text-primary">
                      {businessDetails.externalLinks.website}
                    </a>
                  ) : (
                    <span className="text-primary cursor-pointer">Add</span>
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
