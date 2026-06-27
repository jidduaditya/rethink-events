"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

// ponytail: Phase 1 — visual scaffold only. Form logic + Server Action lands in slice 3.1.

const TAGS = [
  { value: "beginner", label: "BEGINNER" },
  { value: "interview_prep", label: "INTERVIEWS" },
  { value: "ai_pm", label: "AI × PM" },
  { value: "build", label: "BUILD" },
  { value: "resume", label: "RESUME" },
];

export default function NewEventPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-grid-margin py-stack-xl">
        <div className="flex items-center gap-4 border-b-4 border-on-background pb-stack-lg">
          <h1 className="font-serif text-headline-lg font-black uppercase">
            {BRAND.create.header}
          </h1>
          <span className="border-2 border-on-background bg-surface-container px-3 py-1 font-mono text-label-data font-semibold uppercase text-on-surface-variant">
            {BRAND.create.status}
          </span>
        </div>

        <form className="mt-stack-xl flex flex-col gap-stack-lg">
          <Field label="TITLE" required>
            <input
              name="title"
              type="text"
              placeholder="Give it a name that sells itself"
              className="input-base"
            />
          </Field>

          <Field label="DESCRIPTION">
            <textarea
              name="description"
              rows={5}
              placeholder={BRAND.create.descriptionPlaceholder}
              className="input-base resize-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-6">
            <Field label="CITY" required>
              <select name="city" className="input-base">
                <option value="">— SELECT —</option>
                {BRAND.cities.map((c) => (
                  <option key={c} value={c.toLowerCase()}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="CAPACITY">
              <input
                name="capacity"
                type="number"
                min={1}
                placeholder="Leave blank = unlimited"
                className="input-base"
              />
            </Field>
          </div>

          <Field label="VENUE">
            <input
              name="venue"
              type="text"
              placeholder="Name + address"
              className="input-base"
            />
          </Field>

          <div className="grid grid-cols-2 gap-6">
            <Field label="STARTS" required>
              <input name="starts_at" type="datetime-local" className="input-base" />
            </Field>
            <Field label="ENDS" required>
              <input name="ends_at" type="datetime-local" className="input-base" />
            </Field>
          </div>

          <Field label="TAGS">
            <div className="flex flex-wrap gap-3">
              {TAGS.map((tag) => (
                <label
                  key={tag.value}
                  className="flex cursor-pointer items-center gap-2 border-2 border-on-background px-4 py-2 font-mono text-label-mono font-semibold uppercase hover:bg-secondary-container transition-colors has-[:checked]:bg-primary has-[:checked]:text-on-primary"
                >
                  <input type="checkbox" name="tags" value={tag.value} className="sr-only" />
                  {tag.label}
                </label>
              ))}
            </div>
          </Field>

          <div className="flex gap-4 border-t-4 border-on-background pt-stack-lg">
            <Button type="submit" size="lg">{BRAND.create.publish}</Button>
            <Button type="button" variant="outline" size="lg">SAVE DRAFT</Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-mono text-label-mono font-semibold uppercase tracking-widest text-on-surface-variant">
        {label}
        {required && <span className="ml-1 text-primary">*</span>}
      </label>
      {children}
    </div>
  );
}
