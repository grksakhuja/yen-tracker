export function ErrorRetry({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="text-red-400 text-lg">{title}</div>
      <p className="text-gray-500 text-sm">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
      >
        Retry
      </button>
    </div>
  );
}
