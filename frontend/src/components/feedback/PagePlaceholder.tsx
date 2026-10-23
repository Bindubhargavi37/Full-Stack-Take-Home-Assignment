import { Construction } from 'lucide-react';

type Props = { title: string; description: string; plannedItems: readonly string[] };

/** Temporary content for a page whose functionality is built in a later step. */
export function PagePlaceholder({ title, description, plannedItems }: Props) {
  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="card bg-base-200">
        <div className="card-body">
          <div className="flex items-center gap-2">
            <Construction className="text-primary size-5" aria-hidden="true" />
            <h2 className="card-title text-base">Coming next</h2>
          </div>
          <p className="text-base-content/70">{description}</p>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {plannedItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
