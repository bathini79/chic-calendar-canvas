
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ItemForm } from "./components/ItemForm";
import { useItemForm } from "./hooks/use-item-form";

interface ItemDialogProps {
  item?: any;
  onClose?: () => void;
}

export function ItemDialog({ item, onClose }: ItemDialogProps) {
  const { open, setOpen, defaultValues, handleSubmit } = useItemForm(item, onClose);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {item ? 'Edit Item' : 'Add Item'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Item' : 'Add New Item'}</DialogTitle>
        </DialogHeader>
        <ItemForm 
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
