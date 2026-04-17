"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function InvitePageClient({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "invalid" | "needs-signup" | "accepting" | "accepted" | "error">("loading");
  const [orgName, setOrgName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const acceptInvite = useCallback(async () => {
    setStatus("accepting");
    try {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) throw new Error("Failed to accept invite");
      setStatus("accepted");
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }, [token, router]);

  const checkInvite = useCallback(async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      const res = await fetch(`/api/invite/check?token=${token}`);
      if (!res.ok) {
        setStatus("invalid");
        return;
      }

      const { invite } = await res.json();
      setOrgName(invite.orgName);
      setInviteEmail(invite.email);

      if (user?.email === invite.email) {
        acceptInvite();
      } else if (user) {
        setStatus("needs-signup");
      } else {
        setStatus("needs-signup");
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }, [token, acceptInvite]);

  useEffect(() => {
    checkInvite();
  }, [checkInvite]);

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (status === "invalid") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid invite</h1>
          <p className="text-gray-600">This invite has expired or is invalid.</p>
        </div>
      </div>
    );
  }

  if (status === "accepted") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h1>
          <p className="text-gray-600">You&apos;ve been added to {orgName}. Redirecting...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-600">Please try again or contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Join {orgName}</h1>
        <p className="text-gray-600 mb-6">You&apos;ve been invited to join this organization</p>

        {status === "accepting" && (
          <div className="text-center py-4">
            <p className="text-gray-600">Adding you to the team...</p>
          </div>
        )}

        {status === "needs-signup" && (
          <button
            onClick={acceptInvite}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
          >
            Accept invite
          </button>
        )}
      </div>
    </div>
  );
}

import { use } from "react";

export default function InvitePage(props: { params: Promise<{ token: string }> }) {
  const params = use(props.params);
  return <InvitePageClient token={params.token} />;
}
