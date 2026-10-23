import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import type { AgentOption } from 'shared';

type Props = {
  agents: readonly AgentOption[];
  /** Chosen agent ids. Empty means "All agents". */
  value: readonly string[];
  onChange: (agentIds: string[]) => void;
};

/**
 * Admin's agent filter: tick any number of agents, or "All agents" to clear the choice.
 * Built on <details>, so it stays open while ticking boxes; Esc or a click outside closes it.
 */
export function AgentMultiSelect({ agents, value, onChange }: Props) {
  const ref = useRef<HTMLDetailsElement>(null);
  const labelId = useId();
  const chosen = new Set(value);
  const names = agents.filter((agent) => chosen.has(agent.id)).map((agent) => agent.fullName);
  const summary =
    value.length === 0
      ? 'All agents'
      : value.length === 1
        ? (names[0] ?? '1 agent')
        : `${value.length} agents`;

  useEffect(() => {
    function close(event: MouseEvent | KeyboardEvent) {
      const details = ref.current;
      if (!details?.open) return;
      const outside = event instanceof MouseEvent && !details.contains(event.target as Node);
      const escape = event instanceof KeyboardEvent && event.key === 'Escape';
      if (outside || escape) details.open = false;
    }
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, []);

  function toggle(id: string) {
    onChange(chosen.has(id) ? value.filter((item) => item !== id) : [...value, id]);
  }

  return (
    <div className="flex flex-col gap-1 text-sm">
      <span id={labelId} className="text-base-content/70">
        Agents
      </span>
      <details ref={ref} className="dropdown w-full">
        <summary
          className="input input-sm flex w-full cursor-pointer list-none items-center justify-between"
          aria-labelledby={labelId}
        >
          <span className="truncate">{summary}</span>
          <ChevronDown className="size-4 shrink-0 opacity-70" aria-hidden="true" />
        </summary>
        <div
          className="dropdown-content bg-base-100 rounded-box border-base-300 z-30 mt-1 max-h-72 w-full overflow-auto border p-2 shadow"
          role="group"
          aria-labelledby={labelId}
        >
          <label className="hover:bg-base-200 flex cursor-pointer items-center gap-2 rounded px-2 py-1.5">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={value.length === 0}
              onChange={() => onChange([])}
            />
            All agents
          </label>
          <div className="border-base-300 my-1 border-t" />
          {agents.map((agent) => (
            <label
              key={agent.id}
              className="hover:bg-base-200 flex cursor-pointer items-center gap-2 rounded px-2 py-1.5"
            >
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={chosen.has(agent.id)}
                onChange={() => toggle(agent.id)}
              />
              <span className="grow">{agent.fullName}</span>
              {!agent.isActive && <span className="text-base-content/60 text-xs">inactive</span>}
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}
