import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  updateAgentSchema,
  type Agent,
  type UpdateAgentInput,
  type UpdateAgentValues,
} from 'shared';
import { updateAgent } from '@/api/agents.api';
import { applyServerErrors } from '@/components/form/applyServerErrors';
import { TextField } from '@/components/form/TextField';
import { Modal } from '@/components/ui/Modal';

type Props = {
  agent: Agent;
  open: boolean;
  onClose: () => void;
  onSaved: (agent: Agent) => void;
};

/** Admin edits an agent's name, email and phone. Use a `key` so each agent gets a fresh form. */
export function EditAgentDialog({ agent, open, onClose, onSaved }: Props) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateAgentInput, unknown, UpdateAgentValues>({
    resolver: zodResolver(updateAgentSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { fullName: agent.fullName, email: agent.email, phone: agent.phone ?? '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      onSaved(await updateAgent(agent.id, values));
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['fullName', 'email', 'phone']));
    }
  });

  return (
    <Modal open={open} onClose={onClose} title="Edit agent">
      <form onSubmit={onSubmit} noValidate>
        {formError && (
          <div role="alert" className="alert alert-error alert-soft mb-2 text-sm">
            {formError}
          </div>
        )}
        <TextField
          label="Full name"
          placeholder="e.g. Priya Nair"
          autoComplete="off"
          required
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <TextField
          label="Email"
          placeholder="agent@company.com"
          type="email"
          autoComplete="off"
          required
          hint="The agent signs in with this email."
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Phone"
          type="tel"
          inputMode="tel"
          placeholder="10–15 digits (optional)"
          error={errors.phone?.message}
          {...register('phone')}
        />

        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting || !isDirty}>
            {isSubmitting && (
              <span className="loading loading-spinner loading-sm" aria-hidden="true" />
            )}
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
