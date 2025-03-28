
import React, { useState } from "react";
import { Home, Briefcase, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditAddressDialog } from "./EditAddressDialog";

interface Address {
  id: string;
  user_id: string;
  type: 'home' | 'work' | 'other';
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
}

interface AddressCardProps {
  address: Address;
  onEdit: (address: Partial<Address> & { id: string }) => Promise<void>;
  onDelete: (addressId: string) => Promise<void>;
}

export const AddressCard = ({ address, onEdit, onDelete }: AddressCardProps) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'home':
        return <Home className="h-5 w-5" />;
      case 'work':
        return <Briefcase className="h-5 w-5" />;
      default:
        return <Home className="h-5 w-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const handleEditClick = () => {
    setEditDialogOpen(true);
  };

  const handleDeleteClick = async () => {
    if (window.confirm("Are you sure you want to delete this address?")) {
      await onDelete(address.id);
    }
  };

  const formatAddress = () => {
    const parts = [
      address.address_line1,
      address.address_line2,
      address.city,
      address.state,
      address.postal_code,
      address.country
    ].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <>
      <Card className="hover:bg-muted/30 transition-colors">
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-muted rounded-full">
                {getTypeIcon(address.type)}
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-medium">{getTypeLabel(address.type)}</h3>
                  {address.is_default && (
                    <Badge variant="outline" className="text-xs">Default</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{formatAddress()}</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEditClick}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleDeleteClick}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <EditAddressDialog 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen}
        address={address}
        onSubmit={onEdit}
      />
    </>
  );
};
