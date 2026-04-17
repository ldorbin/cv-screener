"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const PLAN_OPTIONS = [
  { value: "trial", label: "Trial" },
  { value: "starter", label: "Starter" },
  { value: "growth", label: "Growth" },
  { value: "agency", label: "Agency" },
];

const STATUS_OPTIONS = [
  { value: "trialing", label: "Trialing" },
  { value: "active", label: "Active" },
  { value: "past_due", label: "Past due" },
  { value: "canceled", label: "Canceled" },
];

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
];

// ── Plan / status override ────────────────────────────────────────────────────

export function PlanOverride({ orgId, currentPlan, currentStatus }: { orgId: string; currentPlan: string; currentStatus: string }) {
  const [plan, setPlan] = useState(currentPlan);
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function save() {
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/admin/orgs/${orgId}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, status }),
    });
    const json = await res.json();
    setMessage({ text: res.ok ? "Saved" : (json.error ?? "Failed"), ok: res.ok });
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
          {PLAN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <Button onClick={save} disabled={loading} size="sm" className="w-full">{loading ? "Saving…" : "Save changes"}</Button>
      {message && <p className={`text-sm ${message.ok ? "text-green-600" : "text-red-600"}`}>{message.text}</p>}
    </div>
  );
}

// ── Edit name ─────────────────────────────────────────────────────────────────

export function EditName({ orgId, currentName }: { orgId: string; currentName: string }) {
  const router = useRouter();
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function save() {
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/admin/orgs/${orgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    setMessage({ text: res.ok ? "Saved" : (json.error ?? "Failed"), ok: res.ok });
    if (res.ok) router.refresh();
    setLoading(false);
  }

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">Organisation name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <Button onClick={save} disabled={loading} size="sm">{loading ? "…" : "Save"}</Button>
      {message && <p className={`text-xs mt-1 ${message.ok ? "text-green-600" : "text-red-600"}`}>{message.text}</p>}
    </div>
  );
}

// ── Add member ────────────────────────────────────────────────────────────────

export function AddMember({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/admin/orgs/${orgId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const json = await res.json();
    if (res.ok) {
      setMessage({ text: json.invited ? `Invite sent to ${email}` : `${email} added`, ok: true });
      setEmail("");
      router.refresh();
    } else {
      setMessage({ text: json.error ?? "Failed", ok: false });
    }
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-2">
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@company.com"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Button type="submit" disabled={loading} size="sm">{loading ? "…" : "Add"}</Button>
      </div>
      {message && <p className={`text-sm ${message.ok ? "text-green-600" : "text-red-600"}`}>{message.text}</p>}
    </form>
  );
}

// ── Remove member ─────────────────────────────────────────────────────────────

export function RemoveMember({ orgId, memberId, email }: { orgId: string; memberId: string; email: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove() {
    if (!confirm(`Remove ${email} from this organisation?`)) return;
    setLoading(true);
    await fetch(`/api/admin/orgs/${orgId}/members/${memberId}`, { method: "DELETE" });
    router.refresh();
    setLoading(false);
  }

  return (
    <button onClick={remove} disabled={loading} className="text-xs text-red-600 hover:underline disabled:opacity-50">
      {loading ? "…" : "Remove"}
    </button>
  );
}

// ── Delete org ────────────────────────────────────────────────────────────────

export function DeleteOrg({ orgId, orgName }: { orgId: string; orgName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function del() {
    if (!confirm(`Permanently delete "${orgName}" and all its data? This cannot be undone.`)) return;
    setLoading(true);
    await fetch(`/api/admin/orgs/${orgId}`, { method: "DELETE" });
    router.push("/admin/orgs");
  }

  return (
    <Button variant="outline" size="sm" onClick={del} disabled={loading} className="border-red-300 text-red-600 hover:bg-red-50">
      {loading ? "Deleting…" : "Delete organisation"}
    </Button>
  );
}
