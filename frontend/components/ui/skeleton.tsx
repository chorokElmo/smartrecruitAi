import { cn } from "@/lib/utils/cn";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("skeleton", className)} />;
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn("card-base p-5 space-y-3", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonStatCard({ className }: SkeletonProps) {
  return (
    <div className={cn("card-base p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function SkeletonListItem({ className }: SkeletonProps) {
  return (
    <div className={cn("flex items-center gap-3 p-3 rounded-xl border border-border", className)}>
      <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-2.5 w-2/5" />
      </div>
      <Skeleton className="h-6 w-12 rounded-full shrink-0" />
    </div>
  );
}
