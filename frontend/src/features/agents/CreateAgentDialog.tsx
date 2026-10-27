import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import {
  createAgentSchema,
  type Agent,
  type CreateAgentInput,
  type CreateAgentValues,
} from 'shared';
import { createAgent } from '@/api/agents.api';
import { applyServerErrors } from '@/components/form/applyServerErrors';
import { PasswordChecklist } from '@/components/form/PasswordChecklist';
import { PasswordField } from '@/components/form/PasswordField';
import { TextField } from '@/components/form/TextField';
import { Modal } from '@/components/ui/Modal';

const EMPTY: CreateAgentInput = { fullName: '', email: '', phone: '', password: '' };

type Props = { open: boolean; onClose: () => void; onCreated: (agent: Agent) => void };

/** Admin adds an agent. The agent signs in with this email and the first password. */
export function CreateAgentDialog({ open, onClose, onCreated }: Props) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateAgentInput, unknown, CreateAgentValues>({
    resolver: zodResolver(createAgentSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: EMPTY,
  });
  const password = useWatch({ control, name: 'password' });

  // Closing always clears the form, including the password.
  function close() {
    reset(EMPTY);
    setFormError(null);
    onClose();
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const agent = await createAgent(values);
      close();
      onCreated(agent);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['fullName', 'email', 'phone', 'password']));
    }
  });

  return (
    <Modal open={open} onClose={close} title="Add agent">
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
        <PasswordField
          label="First password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordChecklist value={password} />
        <p className="text-base-content/70 mt-2 text-sm">
          Share this password with the agent privately. They can change it from their profile.
        </p>

        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting && (
              <span className="loading loading-spinner loading-sm" aria-hidden="true" />
            )}
            Add agent
          </button>
        </div>
      </form>
    </Modal>
  );
}
