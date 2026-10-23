type Item = { label: string; color: string; value?: string };

/** Legend in page text colours; the colour lives only in the swatch beside each label. */
export function ChartLegend({ items }: { items: readonly Item[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            className="size-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <span className="text-base-content/80">{item.label}</span>
          {item.value !== undefined && <span className="font-semibold">{item.value}</span>}
        </li>
      ))}
    </ul>
  );
}
