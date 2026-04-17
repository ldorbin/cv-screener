"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const PLAN_OPTIONS = [
  { value: "trial", label: "Trial (free, 2 seats, 20 CVs/mo)" },
  { value: "starter", label: "Starter — £79/mo (3 seats, 150 CVs/mo)" },
  { value: "growth", label: "Growth — £199/mo (10 seats, 500 CVs/mo)" },
  { value: "agency", label: "Agency — £449/mo (unlimited)" },
];

export default function NewOrgPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("trial");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, plan, ownerEmail: ownerEmail || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed"); return; }
      router.push(`/admin/orgs/${json.id}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/orgs" className="hover:text-primary">Organisations</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">New</span>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create organisation</h1>

      <form onSubmit={submit} className="bg-white rounded-lg shadow p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Organisation name <span className="text-red-500">*</span></label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Recruitment"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {PLAN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Owner email <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="owner@company.com"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <p className="mt-1 text-xs text-gray-500">
            If the account doesn&apos;t exist yet, an invite email will be sent automatically.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create organisation"}
          </Button>
          <Link href="/admin/orgs">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
