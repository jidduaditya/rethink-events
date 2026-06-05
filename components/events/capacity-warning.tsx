import { BRAND } from "@/lib/brand";

export function CapacityWarning() {
  return (
    <div className="border-2 border-on-background bg-surface-container p-stack-md font-mono text-label-mono uppercase text-center">
      {BRAND.errors.full}
    </div>
  );
}
