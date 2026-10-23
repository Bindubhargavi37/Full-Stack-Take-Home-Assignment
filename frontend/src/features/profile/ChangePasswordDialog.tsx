import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { changePasswordSchema, type ChangePasswordInput } from 'shared';
import { changePassword } from '@/api/auth.api';
import { applyServerErrors } from '@/components/form/applyServerErrors';
import { PasswordChecklist } from '@/components/form/PasswordChecklist';
import { PasswordField } from '@/components/form/PasswordField';
import { Modal } from '@/components/ui/Modal';

const EMPTY: ChangePasswordInput = { currentPassword: '', newPassword: '', confirmPassword: '' };

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called with the server's confirmation message after a successful change. */
  onChanged: (message: string) => void;
};

export function ChangePasswordDialog({ open, onClose, onChanged }: Props) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    // Check on submit, then live while fixing. (Checking on blur moved the button mid-click.)
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: EMPTY,
  });
  const newPassword = useWatch({ control, name: 'newPassword' });

  // Closing (Cancel, Esc, backdrop or success) always clears the passwords from the form.
  function close() {
    reset(EMPTY);
    setFormError(null);
    onClose();
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { message } = await changePassword(values);
      close();
      onChanged(message);
    } catch (error) {
      setFormError(
        applyServerErrors(error, setError, ['currentPassword', 'newPassword', 'confirmPassword']),
      );
    }
  });

  return (
    <Modal open={open} onClose={close} title="Change password">
      <form onSubmit={onSubmit} noValidate>
        {formError && (
          <div role="alert" className="alert alert-error alert-soft mb-2 text-sm">
            {formError}
          </div>
        )}

        <PasswordField
          label="Current password"
          autoComplete="current-password"
          required
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <PasswordField
          label="New password"
          autoComplete="new-password"
          required
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <PasswordChecklist value={newPassword} />
        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <p className="text-base-content/70 mt-2 text-sm">
          You will stay signed in here; other devices will be signed out.
        </p>

        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting && (
              <span className="loading loading-spinner loading-sm" aria-hidden="true" />
            )}
            Update password
          </button>
        </div>
      </form>
    </Modal>
  );
}
