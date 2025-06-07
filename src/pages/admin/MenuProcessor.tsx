import { PDFProcessor } from '@/components/admin/PDFProcessor';

export default function MenuProcessor() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Menu Book Processor</h1>
          <p className="text-muted-foreground">
            Upload and process your ALPHA MENU BOOK PDF to extract services and categories data.
          </p>
        </div>
        
        <PDFProcessor />
      </div>
    </div>
  );
}
