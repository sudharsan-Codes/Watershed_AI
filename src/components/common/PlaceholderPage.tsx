export function PlaceholderPage({ title, note }: { title: string; note?: string }) {
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-lg font-bold text-gis-text mb-2">{title}</h1>
      <div className="bg-gis-card border border-dashed border-gis-border rounded-lg p-8 text-sm text-gis-text-muted">
        {note ?? "This section is planned for a later build increment."}
      </div>
    </div>
  );
}
