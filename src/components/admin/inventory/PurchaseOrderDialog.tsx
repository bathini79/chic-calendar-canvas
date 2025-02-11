
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PurchaseOrderForm } from "./components/PurchaseOrderForm";
import { usePurchaseOrderForm } from "./hooks/use-purchase-order-form";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PurchaseOrderDialogProps {
  purchaseOrder?: any;
  onClose?: () => void;
}

export function PurchaseOrderDialog({ purchaseOrder, onClose }: PurchaseOrderDialogProps) {
  const { open, setOpen, defaultValues, handleSubmit } = usePurchaseOrderForm(purchaseOrder, onClose);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {purchaseOrder ? 'Edit Purchase Order' : 'Add Purchase Order'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            {purchaseOrder ? 'Edit Purchase Order' : 'Add New Purchase Order'}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="px-6 pb-6" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          <PurchaseOrderForm 
            defaultValues={defaultValues}
            onSubmit={handleSubmit}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
