import { cn } from "../../utils/cn";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-gray-200 rounded-xl",
        className
      )}
      aria-hidden="true"
    />
  );
}

// Skeleton específico para EntityCard
export function EntityCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm" aria-hidden="true">
      <div className="flex gap-3">
        {/* Avatar */}
        <Skeleton className="w-12 h-12 rounded-full shrink-0" />
        
        <div className="flex-1 min-w-0">
          {/* Título */}
          <Skeleton className="h-5 w-32 mb-2" />
          
          {/* Subtítulo */}
          <Skeleton className="h-4 w-48 mb-2" />
          
          {/* Meta */}
          <Skeleton className="h-3 w-40 mb-3" />
          
          {/* Badges */}
          <div className="flex gap-2 mb-3">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          
          {/* Botões */}
          <div className="flex gap-2">
            <Skeleton className="h-11 flex-1 rounded-2xl" />
            <Skeleton className="h-11 w-24 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton para lista de inbox
export function InboxRowSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm" aria-hidden="true">
      <div className="flex gap-3 items-center">
        {/* Avatar */}
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        
        <div className="flex-1 min-w-0">
          {/* Título */}
          <Skeleton className="h-4 w-40 mb-2" />
          
          {/* Subtítulo */}
          <Skeleton className="h-3 w-56" />
        </div>
        
        {/* Badge unread */}
        <Skeleton className="w-6 h-6 rounded-full" />
      </div>
    </div>
  );
}

// Skeleton para ride no calendário
export function RideCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm" aria-hidden="true">
      <div className="flex items-start gap-3">
        {/* Hora */}
        <Skeleton className="w-12 h-12 rounded-xl" />
        
        <div className="flex-1">
          {/* Título */}
          <Skeleton className="h-5 w-48 mb-2" />
          
          {/* Info */}
          <Skeleton className="h-4 w-32 mb-2" />
          
          {/* Badge */}
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Loading com spinner centrado para estados de página inteira
interface LoadingProps {
  message?: string;
}

export function Loading({ message = "A carregar..." }: LoadingProps) {
  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen bg-[#F7F7F9] gap-4"
      role="status"
      aria-live="polite"
    >
      <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
      <p className="text-lg font-semibold text-gray-900">{message}</p>
    </div>
  );
}

