import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Packages() {
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Service Packages</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Service packages will be available soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}