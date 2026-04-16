import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CvDropzone } from "@/components/cvs/cv-dropzone";

export default async function UploadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: job } = await supabase
    .from("job_specs")
    .select("id, title")
    .eq("id", id)
    .single();

  if (!job) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={`/jobs/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to {job.title}
      </Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload CVs</h1>
        <p className="mt-1 text-muted-foreground">
          Drop as many CVs as you like. We&apos;ll parse them, then score the whole batch in one click.
        </p>
      </div>
      <CvDropzone jobSpecId={id} />
    </div>
  );
}
