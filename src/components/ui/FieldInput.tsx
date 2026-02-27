export function FieldInput({
  label,
  value,
  onChange,
  type = 'text',
  step,
  min,
  max,
  hint,
  id: externalId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: React.HTMLInputTypeAttribute;
  step?: string;
  min?: string;
  max?: string;
  hint?: string;
  id?: string;
}) {
  const inputId = externalId ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-xs text-gray-500">{label}</label>
      <input
        id={inputId}
        type={type}
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500 transition-colors"
      />
      {hint && <span className="text-xs text-gray-600">{hint}</span>}
    </div>
  );
}
