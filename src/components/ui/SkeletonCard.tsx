export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-gray-900 rounded-xl border border-gray-800 p-6 animate-pulse ${className}`}
    >
      <div className="h-4 bg-gray-800 rounded w-1/3 mb-3" />
      <div className="h-8 bg-gray-800 rounded w-2/3 mb-2" />
      <div className="h-4 bg-gray-800 rounded w-1/2" />
    </div>
  );
}
