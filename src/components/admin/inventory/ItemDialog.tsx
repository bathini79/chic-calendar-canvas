
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ItemForm } from "./components/ItemForm";
import { useItemForm } from "./hooks/use-item-form";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ItemDialogProps {
  item?: any;
  onClose?: () => void;
  open?: boolean;
}

export function ItemDialog({ item, onClose, open = false }: ItemDialogProps) {
  const { defaultValues, handleSubmit } = useItemForm(item, onClose);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Item' : 'Add New Item'}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-1">
            <ItemForm 
              defaultValues={defaultValues}
              onSubmit={handleSubmit}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
