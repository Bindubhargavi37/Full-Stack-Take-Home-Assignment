import { useState } from 'react';
import type { Agent } from 'shared';
import { setAgentActive } from '@/api/agents.api';
import { Modal } from '@/components/ui/Modal';
import { ApiError } from '@/lib/apiClient';

type Props = {
  agent: Agent;
  open: boolean;
  onClose: () => void;
  onChanged: (agent: Agent) => void;
};

/** Confirms deactivating (or reactivating) an agent. */
export function AgentStatusDialog({ agent, open, onClose, onChanged }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deactivating = agent.isActive;

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      onChanged(await setAgentActive(agent.id, !deactivating));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={deactivating ? `Deactivate ${agent.fullName}?` : `Reactivate ${agent.fullName}?`}
    >
      {error && (
        <div role="alert" className="alert alert-error alert-soft mb-2 text-sm">
          {error}
        </div>
      )}
      <p className="text-sm">
        {deactivating
          ? 'They will be signed out at once and cannot sign in until you reactivate them. Their submissions and history are kept.'
          : 'They will be able to sign in again with their current password.'}
      </p>
      <div className="modal-action">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className={`btn ${deactivating ? 'btn-error' : 'btn-success'}`}
          onClick={confirm}
          disabled={saving}
        >
          {saving && <span className="loading loading-spinner loading-sm" aria-hidden="true" />}
          {deactivating ? 'Deactivate' : 'Reactivate'}
        </button>
      </div>
    </Modal>
  );
}
