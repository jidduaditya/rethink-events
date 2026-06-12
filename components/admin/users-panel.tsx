"use client";

import { useAdminUsers, useTrustToggle } from "@/hooks/use-admin";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

export function UsersPanel() {
  const { data: users = [], isLoading, isError } = useAdminUsers();
  const trustToggle = useTrustToggle();

  return (
    <section>
      <div className="mb-stack-lg border-b-4 border-on-background pb-stack-md">
        <h2 className="font-serif text-headline-md font-bold uppercase">
          MEMBERS
        </h2>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 border-4 border-on-background bg-surface-container" />
          ))}
        </div>
      )}

      {isError && (
        <p className="font-mono text-label-data uppercase text-error">
          Failed to load members.
        </p>
      )}

      {!isLoading && !isError && (
        <div className="border-4 border-on-background">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b-2 border-on-background bg-surface-container px-stack-md py-2">
            <span className="font-mono text-label-data uppercase font-semibold text-on-surface-variant">
              MEMBER
            </span>
            <span className="font-mono text-label-data uppercase font-semibold text-on-surface-variant">
              ROLE
            </span>
            <span className="font-mono text-label-data uppercase font-semibold text-on-surface-variant">
              TRUST
            </span>
          </div>

          {users.length === 0 && (
            <p className="px-stack-md py-stack-lg font-mono text-label-data uppercase text-on-surface-variant">
              No members yet.
            </p>
          )}

          {users.map((user, i) => (
            <div
              key={user.id}
              className={cn(
                "grid grid-cols-[1fr_auto_auto] items-center gap-4 px-stack-md py-3",
                i < users.length - 1 && "border-b-2 border-on-background"
              )}
            >
              {/* Name + email */}
              <div className="min-w-0">
                <p className="truncate font-mono text-label-mono font-semibold uppercase">
                  {user.full_name || user.email}
                </p>
                <p className="truncate font-mono text-label-data text-on-surface-variant">
                  {user.email}
                </p>
              </div>

              {/* Role */}
              <span className="font-mono text-label-data uppercase text-on-surface-variant">
                {user.role}
              </span>

              {/* Trust toggle (disabled for admins — they always publish) */}
              {user.role === "admin" ? (
                <span className="font-mono text-label-data uppercase text-on-surface-variant">
                  ADMIN
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    trustToggle.mutate({ userId: user.id, trusted: !user.trusted_host })
                  }
                  disabled={trustToggle.isPending}
                  className={cn(
                    "border-2 border-on-background px-3 py-1 font-mono text-label-data uppercase font-semibold hard-shadow hard-shadow-hover hard-shadow-active transition-transform disabled:opacity-50",
                    user.trusted_host
                      ? "bg-secondary-container text-on-secondary-container"
                      : "bg-surface text-on-surface"
                  )}
                >
                  {user.trusted_host
                    ? BRAND.admin.trust.revoke
                    : BRAND.admin.trust.grant}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
