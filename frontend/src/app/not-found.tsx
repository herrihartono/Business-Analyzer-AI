import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <Card className="w-full max-w-md glass">
        <CardContent className="flex flex-col items-center justify-center space-y-6 pt-10 pb-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Page Not Found</h2>
            <p className="text-sm text-muted-foreground">
              The page you are looking for doesn't exist or has been moved.
            </p>
          </div>

          <Link href="/">
            <Button>
              Return to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
