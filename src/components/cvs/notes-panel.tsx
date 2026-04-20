"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Note {
  id: string;
  author_email: string | null;
  content: string;
  created_at: string;
  user_id: string | null;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotesPanel({ cvId, initialNotes, currentUserId }: {
  cvId: string;
  initialNotes: Note[];
  currentUserId: string;
}) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function addNote() {
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/cvs/${cvId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((json.error as string) ?? "Failed to add note");
      } else {
        setNotes((prev) => [...prev, json.note as Note]);
        setContent("");
      }
    } catch {
      setError("Failed to add note");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteNote(noteId: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
        if (res.ok) {
          setNotes((prev) => prev.filter((n) => n.id !== noteId));
        }
      } catch { /* ignore */ }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recruiter notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => (
              <li key={note.id} className="rounded-lg border border-border/60 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {note.author_email ?? "Unknown"} · {relativeTime(note.created_at)}
                  </span>
                  {note.user_id === currentUserId && (
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-destructive"
                      title="Delete note"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a note visible to your team…"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote();
            }}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            size="sm"
            onClick={addNote}
            disabled={submitting || !content.trim()}
            className="self-end"
          >
            {submitting ? "Adding…" : "Add note"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
