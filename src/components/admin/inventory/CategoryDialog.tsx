
import { useState } from "react";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

interface CategoryDialogProps {
  category?: any;
  onClose?: () => void;
}

export function CategoryDialog({ category, onClose }: CategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category?.name || "");
  const [description, setDescription] = useState(category?.description || "");

  const { create, update } = useSupabaseCrud("inventory_categories");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (category) {
        await update(category.id, {
          name,
          description,
        });
      } else {
        await create({
          name,
          description,
        });
      }
      setName("");
      setDescription("");
      setOpen(false);
      if (onClose) onClose();
    } catch (error) {
      console.error("Error saving category:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {category ? 'Edit Category' : 'Add Category'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Edit Category' : 'Add New Category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full">
            {category ? 'Update' : 'Create'} Category
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
