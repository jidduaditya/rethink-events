import { z } from "zod";

const CITIES = ["bangalore", "pune", "delhi", "hyderabad"] as const;
const TAGS = ["beginner", "interview_prep", "ai_pm", "build", "resume"] as const;

export const eventSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().optional(),
    city: z.enum(CITIES),
    venue: z.string().optional(),
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime(),
    capacity: z.number().int().positive().nullable().optional(),
    tags: z.array(z.enum(TAGS)).default([]),
  })
  .refine((d) => new Date(d.ends_at) > new Date(d.starts_at), {
    message: "End time must be after start time",
    path: ["ends_at"],
  });

export type EventInput = z.infer<typeof eventSchema>;
