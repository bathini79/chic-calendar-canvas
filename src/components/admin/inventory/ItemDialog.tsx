
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ItemForm } from "./components/ItemForm";
import { useItemForm } from "./hooks/use-item-form";

interface ItemDialogProps {
  item?: any;
  onClose?: () => void;
  open?: boolean;
}

export function ItemDialog({ item, onClose, open }: ItemDialogProps) {
  const { defaultValues, handleSubmit } = useItemForm(item, onClose);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
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
