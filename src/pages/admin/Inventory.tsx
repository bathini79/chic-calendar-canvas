import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Inventory() {
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Inventory Management</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Manage your salon products inventory
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Organize products by categories
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}