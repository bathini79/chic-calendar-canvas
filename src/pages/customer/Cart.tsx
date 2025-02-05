import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Cart() {
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Your Cart is Empty</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Add some services or packages to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}