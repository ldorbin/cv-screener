import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { JobForm } from "@/components/jobs/job-form";

export default function NewJobPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to job specs
      </Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New job spec</h1>
        <p className="mt-1 text-muted-foreground">
          Describe the role. We&apos;ll use this to score every CV you upload against it.
        </p>
      </div>
      <JobForm />
    </div>
  );
}
