export function PlaceholderPage({ title, note }: { title: string; note?: string }) {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-gray-800 mb-2">{title}</h1>
      <div className="bg-white border border-dashed border-gray-200 rounded-lg p-8 text-sm text-gray-400">
        {note ?? "This section is planned for a later build increment."}
      </div>
    </div>
  );
}
