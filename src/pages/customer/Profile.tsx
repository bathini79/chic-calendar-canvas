import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Profile() {
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Profile management coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}