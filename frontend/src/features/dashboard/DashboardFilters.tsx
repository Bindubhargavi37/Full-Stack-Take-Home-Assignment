import { STATUS_LABELS, SUBMISSION_STATUSES, type AgentOption } from 'shared';
import { AgentMultiSelect } from './AgentMultiSelect';
import { DATE_PRESETS, type DatePreset } from './datePresets';

export type DashboardFilterValues = {
  range: DatePreset;
  fromDate: string;
  toDate: string;
  status: string;
  /** Admin only: chosen agent ids, comma-separated; empty means all agents. */
  agentIds: string;
};

type Props = {
  values: DashboardFilterValues;
  onChange: (changes: Partial<DashboardFilterValues>) => void;
  /** Admin only: shows the agent filter (any number of agents). */
  agents?: readonly AgentOption[];
};

/** One filter row above everything it scopes: every card and chart uses the same filters. */
export function DashboardFilters({ values, onChange, agents }: Props) {
  return (
    <div className="card bg-base-200">
      <div className="card-body grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-base-content/70">Date range</span>
          <select
            className="select select-sm w-full"
            value={values.range}
            onChange={(event) => onChange({ range: event.target.value as DatePreset })}
          >
            {DATE_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        {values.range === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-base-content/70">From</span>
              <input
                type="date"
                className="input input-sm w-full"
                value={values.fromDate}
                max={values.toDate || undefined}
                onChange={(event) => onChange({ fromDate: event.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-base-content/70">To</span>
              <input
                type="date"
                className="input input-sm w-full"
                value={values.toDate}
                min={values.fromDate || undefined}
                onChange={(event) => onChange({ toDate: event.target.value })}
              />
            </label>
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-base-content/70">Status</span>
          <select
            className="select select-sm w-full"
            value={values.status}
            onChange={(event) => onChange({ status: event.target.value })}
          >
            <option value="">All statuses</option>
            {SUBMISSION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>

        {agents && (
          <AgentMultiSelect
            agents={agents}
            value={values.agentIds ? values.agentIds.split(',') : []}
            onChange={(ids) => onChange({ agentIds: ids.join(',') })}
          />
        )}
      </div>
    </div>
  );
}
