"use client";

import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { MOCK_EVENTS } from "@/lib/mock";

// ponytail: Phase 1 — visual scaffold + pre-filled form. Server Action wires in slice 3.1.

const TAGS = [
  { value: "beginner", label: "BEGINNER" },
  { value: "interview_prep", label: "INTERVIEWS" },
  { value: "ai_pm", label: "AI × PM" },
  { value: "build", label: "BUILD" },
  { value: "resume", label: "RESUME" },
];

function toLocalInput(iso: string) {
  return new Date(iso).toISOString().slice(0, 16);
}

export default function EditEventPage({ params }: { params: { id: string } }) {
  const event = MOCK_EVENTS.find((e) => e.id === params.id);
  if (!event) notFound();

  const canCancel = event.state === "published";

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-grid-margin py-stack-xl">
        <div className="flex items-center justify-between border-b-4 border-on-background pb-stack-lg">
          <h1 className="font-serif text-headline-lg font-black uppercase">EDIT EVENT</h1>
          <Link href="/organise">
            <Button variant="ghost" size="sm">← MY EVENTS</Button>
          </Link>
        </div>

        <form className="mt-stack-xl flex flex-col gap-stack-lg">
          <Field label="TITLE" required>
            <input
              name="title"
              type="text"
              defaultValue={event.title}
              className="input-base"
            />
          </Field>

          <Field label="DESCRIPTION">
            <textarea
              name="description"
              rows={5}
              defaultValue={event.description ?? ""}
              className="input-base resize-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-6">
            <Field label="CITY" required>
              <select name="city" defaultValue={event.city} className="input-base">
                {BRAND.cities.map((c) => (
                  <option key={c} value={c.toLowerCase()}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="CAPACITY">
              <input
                name="capacity"
                type="number"
                min={1}
                defaultValue={event.capacity ?? ""}
                placeholder="Unlimited"
                className="input-base"
              />
            </Field>
          </div>

          <Field label="VENUE">
            <input name="venue" type="text" defaultValue={event.venue ?? ""} className="input-base" />
          </Field>

          <div className="grid grid-cols-2 gap-6">
            <Field label="STARTS" required>
              <input name="starts_at" type="datetime-local" defaultValue={toLocalInput(event.starts_at)} className="input-base" />
            </Field>
            <Field label="ENDS" required>
              <input name="ends_at" type="datetime-local" defaultValue={toLocalInput(event.ends_at)} className="input-base" />
            </Field>
          </div>

          <Field label="TAGS">
            <div className="flex flex-wrap gap-3">
              {TAGS.map((tag) => (
                <label
                  key={tag.value}
                  className="flex cursor-pointer items-center gap-2 border-2 border-on-background px-4 py-2 font-mono text-label-mono font-semibold uppercase hover:bg-secondary-container transition-colors has-[:checked]:bg-primary has-[:checked]:text-on-primary"
                >
                  <input
                    type="checkbox"
                    name="tags"
                    value={tag.value}
                    defaultChecked={event.tags.includes(tag.value as never)}
                    className="sr-only"
                  />
                  {tag.label}
                </label>
              ))}
            </div>
          </Field>

          <div className="flex flex-wrap gap-4 border-t-4 border-on-background pt-stack-lg">
            <Button type="submit" size="lg">SAVE CHANGES</Button>
            {canCancel && (
              <Button type="button" variant="destructive" size="lg">
                CANCEL EVENT
              </Button>
            )}
            <Link href={`/e/${event.id}`}>
              <Button type="button" variant="ghost" size="lg">VIEW ↗</Button>
            </Link>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-mono text-label-mono font-semibold uppercase tracking-widest text-on-surface-variant">
        {label}{required && <span className="ml-1 text-primary">*</span>}
      </label>
      {children}
    </div>
  );
}
