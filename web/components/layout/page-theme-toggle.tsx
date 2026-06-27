"use client";

import { useTheme } from "@/lib/providers";
import { cn } from "@/lib/utils";

const options = ["LIGHT", "DARK", "AUTO"] as const;
const themeMap = { LIGHT: "light", DARK: "dark", AUTO: "auto" } as const;

export function PageThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-stack-sm">
      {options.map((opt) => {
        const isActive = theme === themeMap[opt];
        return (
          <button
            key={opt}
            onClick={() => setTheme(themeMap[opt])}
            className={cn(
              "font-mono text-label-data font-semibold uppercase tracking-wide transition-colors",
              isActive
                ? "text-foreground underline decoration-primary decoration-2 underline-offset-4"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
