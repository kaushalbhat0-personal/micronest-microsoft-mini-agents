import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload</h1>
        <p className="text-muted-foreground">
          Upload Excel or CSV files to process follow-ups.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Drag and drop your file here, or click to browse.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
