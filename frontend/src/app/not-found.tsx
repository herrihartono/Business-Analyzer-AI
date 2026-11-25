import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="page-shell flex min-h-[60vh] items-center justify-center">
      <Card className="surface w-full max-w-md border-0 shadow-none">
        <CardContent className="flex flex-col items-center justify-center space-y-6 pt-10 pb-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">Halaman tidak ditemukan</h2>
            <p className="text-sm text-muted-foreground">
              Alamat yang Anda buka tidak tersedia atau sudah dipindahkan.
            </p>
          </div>

          <Link href="/">
            <Button className="rounded-xl">
              Kembali ke ringkasan
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
