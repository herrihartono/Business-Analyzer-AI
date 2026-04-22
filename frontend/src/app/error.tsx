"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <Card className="w-full max-w-md glass border-destructive/20">
        <CardContent className="flex flex-col items-center justify-center space-y-6 pt-10 pb-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred while processing your request.
            </p>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
            >
              Go to Dashboard
            </Button>
            <Button
              onClick={() => reset()}
            >
              Try again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
