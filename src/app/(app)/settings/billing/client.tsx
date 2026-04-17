"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

export default function BillingClient({ orgId }: { orgId: string }) {
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);
  const [loadingManage, setLoadingManage] = useState(false);

  const handleUpgrade = async () => {
    setLoadingUpgrade(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: "starter" }),
      });

      if (!res.ok) throw new Error("Failed to create checkout session");
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error(err);
      alert("Failed to start upgrade");
    } finally {
      setLoadingUpgrade(false);
    }
  };

  const handleManage = async () => {
    setLoadingManage(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to create portal session");
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error(err);
      alert("Failed to open billing portal");
    } finally {
      setLoadingManage(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleUpgrade}
        disabled={loadingUpgrade || loadingManage}
        className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 disabled:bg-gray-100 rounded-lg border border-blue-200 transition"
      >
        <span className="font-medium text-blue-900">Upgrade your plan</span>
        <ChevronRight className="w-5 h-5 text-blue-600" />
      </button>

      <button
        onClick={handleManage}
        disabled={loadingUpgrade || loadingManage}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 disabled:bg-gray-100 rounded-lg border border-gray-200 transition"
      >
        <span className="font-medium text-gray-900">Manage subscription</span>
        <ChevronRight className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}
