import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  KeyRound,
  Pencil,
  Power,
  Search,
  UserPlus,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { Agent } from 'shared';
import { listAgents } from '@/api/agents.api';
import { AgentStatusDialog } from '@/features/agents/AgentStatusDialog';
import { CreateAgentDialog } from '@/features/agents/CreateAgentDialog';
import { EditAgentDialog } from '@/features/agents/EditAgentDialog';
import { ResetPasswordDialog } from '@/features/agents/ResetPasswordDialog';
import { formatDateTime } from '@/lib/format';
import { queryKeys } from '@/lib/queryKeys';

const PAGE_SIZE = '10';

type OpenDialog = { kind: 'edit' | 'reset' | 'status'; agent: Agent } | null;

/** Admin: the agents they manage, with create, edit, reset password and deactivate. */
export function AgentListPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const [searchText, setSearchText] = useState(search);
  const [createOpen, setCreateOpen] = useState(false);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const params = { page: String(page), pageSize: PAGE_SIZE, search, status };
  const { data, isPending, isError, error, isFetching, refetch } = useQuery({
    queryKey: queryKeys.agentList(params),
    queryFn: () => listAgents(params),
    placeholderData: keepPreviousData,
  });

  function updateParams(changes: Record<string, string>) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      return next;
    });
  }

  /** After any change: close the dialog, say what happened, and reload agent data. */
  async function done(message: string) {
    setDialog(null);
    setNotice(message);
    await queryClient.invalidateQueries({ queryKey: queryKeys.agents });
    // Submission lists show agent names.
    await queryClient.invalidateQueries({ queryKey: queryKeys.submissions });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Manage agents</h1>
          <p className="text-base-content/70 text-sm">
            The agents you manage. Agents cannot sign up; you create their accounts here.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setNotice(null);
            setCreateOpen(true);
          }}
        >
          <UserPlus className="size-4" aria-hidden="true" />
          Add agent
        </button>
      </div>

      {notice && (
        <div role="status" className="alert alert-success alert-soft">
          <CheckCircle2 className="size-5" aria-hidden="true" />
          {notice}
        </div>
      )}

      <div className="card bg-base-200">
        <div className="card-body flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <form
            role="search"
            className="flex grow gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              updateParams({ search: searchText.trim(), page: '' });
            }}
          >
            <label className="input w-full">
              <Search className="size-4 opacity-60" aria-hidden="true" />
              <input
                type="search"
                value={searchText}
                maxLength={100}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search name or email"
                aria-label="Search agents"
                className="grow"
              />
            </label>
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </form>
          <label className="flex flex-col gap-1 text-sm sm:w-48">
            <span className="text-base-content/70">Status</span>
            <select
              className="select w-full"
              value={status}
              onChange={(event) => updateParams({ status: event.target.value, page: '' })}
            >
              <option value="">All agents</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>
      </div>

      {isPending ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg" aria-label="Loading agents" />
        </div>
      ) : isError ? (
        <div role="alert" className="alert alert-error alert-soft">
          <span>{error.message}</span>
          <button type="button" className="btn btn-sm" onClick={() => void refetch()}>
            Try again
          </button>
        </div>
      ) : data.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Users className="text-base-content/40 size-12" aria-hidden="true" />
          <p className="text-base-content/70">
            {search || status ? 'No agents match these filters.' : 'You have no agents yet.'}
          </p>
        </div>
      ) : (
        <>
          <div
            className={`border-base-300 overflow-x-auto rounded-box border transition-opacity ${isFetching ? 'opacity-60' : ''}`}
          >
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="hidden md:table-cell">Phone</th>
                  <th className="hidden text-right sm:table-cell">Submissions</th>
                  <th className="hidden lg:table-cell">Last sign-in</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((agent) => (
                  <tr key={agent.id} className="hover:bg-base-200">
                    <td>
                      <div className="font-medium">{agent.fullName}</div>
                      <div className="text-base-content/70 text-sm break-all">{agent.email}</div>
                    </td>
                    <td className="hidden whitespace-nowrap md:table-cell">{agent.phone ?? '—'}</td>
                    <td className="hidden text-right sm:table-cell">{agent.submissionCount}</td>
                    <td className="hidden whitespace-nowrap lg:table-cell">
                      {formatDateTime(agent.lastLoginAt)}
                    </td>
                    <td>
                      <span
                        className={`badge badge-sm ${agent.isActive ? 'badge-success' : 'badge-neutral'}`}
                      >
                        {agent.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {/* Plain buttons, not a pop-up menu: a menu would be cut off by the
                          table's scroll box on the last rows. */}
                      <div className="flex justify-end gap-1">
                        <Link
                          to={`/submissions?agentId=${agent.id}`}
                          className="btn btn-ghost btn-sm btn-square"
                          aria-label={`View submissions of ${agent.fullName}`}
                          title="View submissions"
                        >
                          <ClipboardList className="size-4" />
                        </Link>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-square"
                          aria-label={`Edit ${agent.fullName}`}
                          title="Edit details"
                          onClick={() => setDialog({ kind: 'edit', agent })}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-square"
                          aria-label={`Reset password for ${agent.fullName}`}
                          title="Reset password"
                          onClick={() => setDialog({ kind: 'reset', agent })}
                        >
                          <KeyRound className="size-4" />
                        </button>
                        <button
                          type="button"
                          className={`btn btn-ghost btn-sm btn-square ${agent.isActive ? 'text-error' : 'text-success'}`}
                          aria-label={`${agent.isActive ? 'Deactivate' : 'Reactivate'} ${agent.fullName}`}
                          title={agent.isActive ? 'Deactivate' : 'Reactivate'}
                          onClick={() => setDialog({ kind: 'status', agent })}
                        >
                          <Power className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav
            className="flex flex-wrap items-center justify-between gap-2 text-sm"
            aria-label="Pagination"
          >
            <span className="text-base-content/70">
              {data.total} agent{data.total === 1 ? '' : 's'}
            </span>
            <div className="join">
              <button
                type="button"
                className="btn btn-sm join-item"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="btn btn-sm join-item pointer-events-none">
                Page {data.page} of {Math.max(1, data.totalPages)}
              </span>
              <button
                type="button"
                className="btn btn-sm join-item"
                disabled={page >= data.totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </nav>
        </>
      )}

      <CreateAgentDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(agent) =>
          void done(`${agent.fullName} was added. They can sign in with ${agent.email}.`)
        }
      />
      {dialog?.kind === 'edit' && (
        <EditAgentDialog
          key={dialog.agent.id}
          agent={dialog.agent}
          open
          onClose={() => setDialog(null)}
          onSaved={(agent) => void done(`${agent.fullName}'s details were saved.`)}
        />
      )}
      {dialog?.kind === 'reset' && (
        <ResetPasswordDialog
          key={dialog.agent.id}
          agent={dialog.agent}
          open
          onClose={() => setDialog(null)}
          onReset={(message) => void done(message)}
        />
      )}
      {dialog?.kind === 'status' && (
        <AgentStatusDialog
          key={dialog.agent.id}
          agent={dialog.agent}
          open
          onClose={() => setDialog(null)}
          onChanged={(agent) =>
            void done(
              agent.isActive
                ? `${agent.fullName} was reactivated.`
                : `${agent.fullName} was deactivated and signed out.`,
            )
          }
        />
      )}
    </div>
  );
}
