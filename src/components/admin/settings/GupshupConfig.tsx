
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function GupshupConfig() {
  const [error] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>GupShup Configuration</CardTitle>
        <CardDescription>
          Configure GupShup for WhatsApp notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-md border p-4 flex flex-col items-center justify-center text-center">
          <Info className="h-10 w-10 text-muted-foreground mb-2" />
          <h3 className="text-lg font-medium mb-1">GupShup Integration Not Available</h3>
          <p className="text-muted-foreground text-sm">
            The GupShup integration is currently not available. Please check back later.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
