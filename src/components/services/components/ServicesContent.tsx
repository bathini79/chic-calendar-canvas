import { ServicesGrid } from "../ServicesGrid";
import { ServicesList } from "../ServicesList";

interface ServicesContentProps {
  view: 'grid' | 'list';
  searchQuery: string;
  onEdit: (service: any) => void;
}

export function ServicesContent({ 
  view, 
  searchQuery, 
  onEdit 
}: ServicesContentProps) {
  return view === 'grid' ? (
    <ServicesGrid searchQuery={searchQuery} onEdit={onEdit} />
  ) : (
    <ServicesList searchQuery={searchQuery} onEdit={onEdit} />
  );
}