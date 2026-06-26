// Manual types matching our schema.
// Replace with generated types once Supabase CLI is connected:
//   bunx supabase gen types typescript --local > lib/types.ts

export type ProfileGoal =
  | "break_into_pm"
  | "grow_as_pm"
  | "build_products"
  | "ai_pm"
  | "interview_prep";

export type ProfileLevel = "aspiring" | "early" | "mid" | "senior";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: "member" | "admin";
  city: string | null;
  trusted_host: boolean;
  goal: ProfileGoal | null;
  level: ProfileLevel | null;
  created_at: string;
};

export type EventStatus = "pending" | "approved" | "rejected" | "cancelled";
export type EventType = "online" | "offline";
export type RegisterMode = "native" | "external";
export type EventTag =
  | "beginner"
  | "interview-prep"
  | "ai-pm"
  | "build"
  | "resume";

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
  tag: EventTag | null;
  featured_for_goal: ProfileGoal | null;
  featured_for_level: ProfileLevel | null;
  featured_for_city: string | null;
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
export type RegistrationStatus = "confirmed" | "waitlisted" | "cancelled";

export type Registration = {
  id: string;
  user_id: string;
  event_id: string;
  kind: RegistrationKind;
  status: RegistrationStatus;
  registration_code: string;
  checked_in_at: string | null;
  created_at: string;
};

export type RegistrationWithEvent = Registration & { event: Event };

export type CreateRegistrationResult = {
  success: boolean;
  state?: "confirmed" | "waitlisted";
  code?: string;
  position?: number;
  kind?: RegistrationKind;
  reason?: "not_found" | "not_approved" | "past" | "already_registered";
};

export type EventMessage = {
  id: string;
  event_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type PublicEvent = {
  id: string;
  title: string;
  description: string;
  event_type: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  capacity: number | null;
  city: string | null;
  location_name: string | null;
  location_address: string | null;
  meet_url: string | null;
  image_url: string | null;
  status: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_by: string;
  host_name: string;
  confirmed_count: number;
  register_mode: string | null;
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
        Insert: Omit<Registration, "id" | "created_at"> & {
          status?: RegistrationStatus;
          registration_code?: string;
        };
        Update: never;
      };
      allowlist: {
        Row: AllowlistEntry;
        Insert: Omit<AllowlistEntry, "id" | "created_at">;
        Update: never;
      };
      event_messages: {
        Row: EventMessage;
        Insert: Omit<EventMessage, "id" | "created_at">;
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
      cancel_my_registration: {
        Args: { p_registration_id: string };
        Returns: { success: boolean; reason?: string; promoted?: unknown };
      };
      host_remove_registration: {
        Args: { p_registration_id: string };
        Returns: { success: boolean; reason?: string; promoted?: unknown };
      };
      set_check_in: {
        Args: { p_registration_id: string; p_checked_in: boolean };
        Returns: { success: boolean; reason?: string };
      };
      get_ticket: {
        Args: { p_code: string };
        Returns: {
          event_id: string; event_title: string; starts_at: string; ends_at: string;
          timezone: string; venue: string; city: string | null; first_name: string;
          status: RegistrationStatus; registration_code: string; waitlist_position: number | null;
        } | null;
      };
      find_conflict: {
        Args: { p_user_id: string; p_event_id: string };
        Returns: string | null;
      };
      promote_from_waitlist: {
        Args: { p_event_id: string };
        Returns: { id: string; user_id: string; registration_code: string } | null;
      };
      get_public_event: {
        Args: { p_event_id: string };
        Returns: {
          id: string; title: string; description: string; event_type: string;
          starts_at: string; ends_at: string; timezone: string; capacity: number | null;
          city: string | null; location_name: string | null; location_address: string | null;
          meet_url: string | null; image_url: string | null; status: string;
          cancelled_at: string | null; cancellation_reason: string | null;
          created_by: string; host_name: string; confirmed_count: number;
          register_mode: string | null;
        } | null;
      };
      get_cohort_counts: {
        Args: { p_event_ids: string[]; p_goal: string; p_level: string; p_city: string };
        Returns: { event_id: string; cohort_count: number }[];
      };
    };
  };
};
