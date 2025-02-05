import { Card } from "@/components/ui/card";
import { 
  LayoutGrid, 
  Package, 
  Import, 
  Package2, 
  Tags, 
  ClipboardList,
  Users2,
  Settings2,
  FileText
} from "lucide-react";
import { Link } from "react-router-dom";

interface ManageCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
}

function ManageCard({ title, description, icon, to }: ManageCardProps) {
  return (
    <Link to={to}>
      <Card className="p-6 hover:bg-muted/50 transition-colors cursor-pointer h-full">
        <div className="flex flex-col gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-muted-foreground text-sm mt-1">{description}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function Manage() {
  const catalogueItems = [
    {
      title: "Services",
      description: "Add, edit, and update the services you offer, which will display in your online menu and reflect in billing, ensuring easy management and organization.",
      icon: <LayoutGrid className="w-6 h-6" />,
      to: "/services"
    },
    {
      title: "Packages",
      description: "Create and manage service bundles to provide clients with great value and options.",
      icon: <Package className="w-6 h-6" />,
      to: "/packages"
    },
    {
      title: "Import and Export",
      description: "Quickly import and export customer, service, product, and booking data for efficient management.",
      icon: <Import className="w-6 h-6" />,
      to: "/import-export"
    }
  ];

  const inventoryItems = [
    {
      title: "Products",
      description: "Keep track of your products and stock, ensuring everything is well-stocked and organized. You can also add, edit, and update products available for sale both online and in-store.",
      icon: <Package2 className="w-6 h-6" />,
      to: "/products"
    },
    {
      title: "Product Category",
      description: "Helps you monitor and manage all stock details, ensuring proper organization and availability.",
      icon: <Tags className="w-6 h-6" />,
      to: "/product-categories"
    },
    {
      title: "Inventory Receipts",
      description: "Track incoming stock with product details, quantities, suppliers, and dates to keep your inventory updated and organized.",
      icon: <ClipboardList className="w-6 h-6" />,
      to: "/inventory-receipts"
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Manage</h1>
        <p className="text-muted-foreground mt-2">
          Manage your business settings, services, and inventory
        </p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Catalogue</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalogueItems.map((item) => (
            <ManageCard key={item.title} {...item} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Inventory</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventoryItems.map((item) => (
            <ManageCard key={item.title} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}