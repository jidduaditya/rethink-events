// Manual types matching our schema.
// Replace with generated types once Supabase CLI is connected:
//   bunx supabase gen types typescript --local > lib/types.ts

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: "member" | "admin";
  city: string | null;
  trusted_host: boolean;
  created_at: string;
};

export type EventStatus = "pending" | "approved" | "rejected" | "cancelled";
export type EventType = "online" | "offline";
export type RegisterMode = "native" | "external";

export type Event = {
  id: string;
  created_by: string;
  title: string;
  description: string;
  event_type: EventType;
  meet_url: string | null;
  location_name: string | null;
  location_address: string | null;
  city?: string | null;
  image_url?: string | null;
  speaker_name?: string | null;
  speaker_bio?: string | null;
  speaker_photo_url?: string | null;
  register_mode?: RegisterMode;
  register_url?: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  capacity: number | null;
  status: EventStatus;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  reminder_sent_at: string | null;
  created_at: string;
};

export type EventWithOrganizer = Event & {
  organizer: Pick<Profile, "id" | "full_name" | "email">;
  // Optionally included by feed query for capacity state derivation.
  registrations?: { id: string }[];
};

export type RegistrationKind = "native" | "external";

export type Registration = {
  id: string;
  user_id: string;
  event_id: string;
  kind: RegistrationKind;
  created_at: string;
};

export type RegistrationWithEvent = Registration & { event: Event };

export type CreateRegistrationResult = {
  success: boolean;
  kind?: RegistrationKind;
  reason?: "conflict" | "full" | "past" | "not_approved";
};

export type AllowlistEntry = {
  id: string;
  email: string;
  source: "manual" | "rethink_sync";
  added_by: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "trusted_host">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      events: {
        Row: Event;
        Insert: Omit<Event, "id" | "created_at" | "status" | "cancelled_at" | "cancellation_reason" | "reminder_sent_at"> & {
          status?: EventStatus;
        };
        Update: Partial<Omit<Event, "id" | "created_at" | "created_by">>;
      };
      registrations: {
        Row: Registration;
        Insert: Omit<Registration, "id" | "created_at">;
        Update: never;
      };
      allowlist: {
        Row: AllowlistEntry;
        Insert: Omit<AllowlistEntry, "id" | "created_at">;
        Update: never;
      };
    };
    Functions: {
      create_registration: {
        Args: { p_user_id: string; p_event_id: string };
        Returns: CreateRegistrationResult;
      };
      is_allowlisted: {
        Args: { p_email: string };
        Returns: boolean;
      };
      approve_event: {
        Args: { p_event_id: string };
        Returns: { success: boolean; reason?: string };
      };
      cancel_event: {
        Args: { p_event_id: string; p_reason: string };
        Returns: { success: boolean; reason?: string; registrant_emails?: string[] };
      };
      set_trusted_host: {
        Args: { p_user_id: string; p_trusted: boolean };
        Returns: { success: boolean; reason?: string };
      };
    };
  };
};
