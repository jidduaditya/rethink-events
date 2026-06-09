// Manual types matching our 3-table MVP schema.
// Replace with generated types once Supabase CLI is connected:
//   bunx supabase gen types typescript --local > lib/types.ts

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: "member" | "admin";
  city: string | null;
  created_at: string;
};

export type EventStatus = "pending" | "approved" | "rejected";
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
  created_at: string;
};

export type EventWithOrganizer = Event & {
  organizer: Pick<Profile, "id" | "full_name" | "email">;
};

export type Rsvp = {
  id: string;
  user_id: string;
  event_id: string;
  created_at: string;
};

export type RsvpWithEvent = Rsvp & {
  event: Event;
};

export type CreateRsvpResult = {
  success: boolean;
  reason?: "conflict" | "full" | "past" | "not_approved";
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
        Insert: Omit<Profile, "created_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      events: {
        Row: Event;
        Insert: Omit<Event, "id" | "created_at" | "status"> & {
          status?: EventStatus;
        };
        Update: Partial<Omit<Event, "id" | "created_at" | "created_by">>;
      };
      rsvps: {
        Row: Rsvp;
        Insert: Omit<Rsvp, "id" | "created_at">;
        Update: never;
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
      create_rsvp: {
        Args: { p_user_id: string; p_event_id: string };
        Returns: CreateRsvpResult;
      };
      create_registration: {
        Args: { p_user_id: string; p_event_id: string };
        Returns: CreateRegistrationResult;
      };
      is_allowlisted: {
        Args: { p_email: string };
        Returns: boolean;
      };
    };
  };
};
