import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      {/* Icon container */}
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Icon className="w-7 h-7 text-muted-foreground/50" />
        </div>
        {/* Decorative rings */}
        <div className="absolute -inset-2 rounded-3xl border border-border/40 opacity-60" />
        <div className="absolute -inset-4 rounded-[28px] border border-border/20 opacity-30" />
      </div>

      <h3 className="text-base font-semibold text-foreground mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-5">
        {description}
      </p>

      {action && (
        <Button
          onClick={action.onClick}
          className="gradient-bg text-white border-0 shadow-md h-9 px-4 text-sm font-medium"
          style={{ boxShadow: "var(--shadow-primary)" }}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
