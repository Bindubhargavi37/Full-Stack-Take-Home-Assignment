import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { resetAgentPasswordSchema, type Agent, type ResetAgentPasswordInput } from 'shared';
import { resetAgentPassword } from '@/api/agents.api';
import { applyServerErrors } from '@/components/form/applyServerErrors';
import { PasswordChecklist } from '@/components/form/PasswordChecklist';
import { PasswordField } from '@/components/form/PasswordField';
import { Modal } from '@/components/ui/Modal';

const EMPTY: ResetAgentPasswordInput = { newPassword: '', confirmPassword: '' };

type Props = {
  agent: Agent;
  open: boolean;
  onClose: () => void;
  onReset: (message: string) => void;
};

/** Admin sets a new password for an agent who forgot theirs. */
export function ResetPasswordDialog({ agent, open, onClose, onReset }: Props) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ResetAgentPasswordInput>({
    resolver: zodResolver(resetAgentPasswordSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: EMPTY,
  });
  const newPassword = useWatch({ control, name: 'newPassword' });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await resetAgentPassword(agent.id, values);
      onReset(`New password set for ${agent.fullName}. They were signed out on every device.`);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['newPassword', 'confirmPassword']));
    }
  });

  return (
    <Modal open={open} onClose={onClose} title={`Reset password for ${agent.fullName}`}>
      <form onSubmit={onSubmit} noValidate>
        {formError && (
          <div role="alert" className="alert alert-error alert-soft mb-2 text-sm">
            {formError}
          </div>
        )}
        <PasswordField
          label="New password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <PasswordChecklist value={newPassword} />
        <PasswordField
          label="Confirm new password"
          placeholder="Type the new password again"
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <p className="text-base-content/70 mt-2 text-sm">
          The agent will be signed out everywhere and any lockout is cleared.
        </p>

        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting && (
              <span className="loading loading-spinner loading-sm" aria-hidden="true" />
            )}
            Reset password
          </button>
        </div>
      </form>
    </Modal>
  );
}
