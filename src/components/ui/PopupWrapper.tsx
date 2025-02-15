// src/components/common/PopupWrapper.tsx
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface PopupWrapperProps {
  children: React.ReactNode;
  popupContent: React.ReactNode;
}

export const PopupWrapper: React.FC<PopupWrapperProps> = ({
  children,
  popupContent,
}) => {
  return (
 <Dialog >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent 
        className="
          sm:max-w-[90%] 
          sm:w-[90%] 
          fixed 
          bottom-0 
          left-1/2 
          -translate-x-1/2 
          h-[90vh] 
          m-0 
          rounded-t-2xl
          overflow-y-auto 
          animate-in 
          slide-in-from-bottom-5
          border-0
          p-0
        "
      >
        {/* Handle bar */}
        <div className="w-full flex justify-center p-2 border-b">
          <div className="w-16 h-1 bg-gray-300 rounded-full"/>
        </div>
        
        {/* Content */}
        <div className="h-[calc(90vh-2rem)] overflow-y-auto">
          {popupContent}
        </div>
      </DialogContent>
    </Dialog>
  );
};
