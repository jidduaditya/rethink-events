"use client";

import React from "react";
import {
  useAdminStats,
  useAdminPendingEvents,
  useAdminAction,
} from "@/hooks/use-admin";
import { AdminStatsPanel } from "@/components/admin/admin-stats-panel";
import { ApprovalCard } from "@/components/admin/approval-card";
import { AllowlistPanel } from "@/components/admin/allowlist-panel";
import { UsersPanel } from "@/components/admin/users-panel";

export default function AdminPage() {
  const { data: stats, isLoading: isLoadingStats } = useAdminStats();
  const {
    data: pendingData,
    fetchNextPage,
    hasNextPage,
    isLoading: isLoadingPending,
  } = useAdminPendingEvents();
  const action = useAdminAction();

  const pendingEvents = pendingData?.pages.flatMap((page) => page) ?? [];

  return (
    <div className="dot-grid min-h-[80vh]">
      <div className="mx-auto max-w-[1600px] px-grid-margin py-stack-xl">
        {/* Stats panel */}
        {isLoadingStats ? (
          <div className="mb-stack-xl grid grid-cols-3 gap-grid-gutter">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 border-4 border-on-background bg-surface-container" />
            ))}
          </div>
        ) : (
          <div className="mb-stack-xl">
            <AdminStatsPanel
              totalEvents={stats?.totalEvents ?? 0}
              totalMembers={stats?.totalMembers ?? 0}
              pendingCount={stats?.pendingCount ?? 0}
            />
          </div>
        )}

        {/* Pending approval queue */}
        <div className="mb-stack-lg border-b-4 border-on-background pb-stack-md">
          <h2 className="font-serif text-headline-md font-bold uppercase">
            PENDING APPROVAL
          </h2>
        </div>

        {isLoadingPending && (
          <div className="space-y-stack-lg">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 border-4 border-on-background bg-surface-container" />
            ))}
          </div>
        )}

        {!isLoadingPending && pendingEvents.length === 0 && (
          <p className="py-stack-xl text-center font-mono text-body-lg font-semibold uppercase text-on-surface-variant">
            All clear. No events pending.
          </p>
        )}

        {!isLoadingPending && pendingEvents.length > 0 && (
          <div className="space-y-stack-lg">
            {pendingEvents.map((event) => (
              <ApprovalCard
                key={event.id}
                event={event}
                onApprove={() =>
                  action.mutate({ eventId: event.id, status: "approved" })
                }
                onReject={() =>
                  action.mutate({ eventId: event.id, status: "rejected" })
                }
                isLoading={action.isPending}
              />
            ))}
          </div>
        )}

        {hasNextPage && (
          <div className="mt-stack-xl flex justify-center">
            <button
              onClick={() => fetchNextPage()}
              className="border-2 border-on-background bg-surface px-8 py-3 font-mono text-label-mono uppercase font-semibold hard-shadow hard-shadow-hover hard-shadow-active"
            >
              LOAD MORE
            </button>
          </div>
        )}

        {/* Members with trust management */}
        <div className="mt-stack-xl">
          <UsersPanel />
        </div>

        {/* Allowlist */}
        <div className="mt-stack-xl">
          <AllowlistPanel />
        </div>
      </div>
    </div>
  );
}
