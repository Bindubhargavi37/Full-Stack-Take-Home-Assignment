import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import {
  updateProfileSchema,
  type AuthUser,
  type UpdateProfileInput,
  type UpdateProfileValues,
} from 'shared';
import { updateProfile } from '@/api/auth.api';
import { applyServerErrors } from '@/components/form/applyServerErrors';
import { PasswordField } from '@/components/form/PasswordField';
import { TextField } from '@/components/form/TextField';
import { Modal } from '@/components/ui/Modal';

type Props = {
  user: AuthUser;
  onClose: () => void;
  onSaved: (user: AuthUser) => void;
};

/**
 * Edit your own name and phone. Admins can also change their email (the sign-in name), which
 * asks for their current password; agents see their email read-only and ask their admin.
 * The server enforces the same rules. Render it only while open, so it starts from fresh values.
 */
export function EditProfileDialog({ user, onClose, onSaved }: Props) {
  const isAdmin = user.role === 'ADMIN';
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateProfileInput, unknown, UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      fullName: user.fullName,
      phone: user.phone ?? '',
      email: user.email,
      currentPassword: '',
    },
  });
  const email = useWatch({ control, name: 'email' }) ?? '';
  const emailChanged = isAdmin && email.trim().toLowerCase() !== user.email;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    // The server checks this too; asking here first saves a round trip.
    if (emailChanged && !values.currentPassword) {
      setError('currentPassword', {
        message: 'Enter your current password to change your email',
      });
      return;
    }
    try {
      onSaved(
        await updateProfile({
          fullName: values.fullName,
          phone: values.phone,
          // Only send the email (and password) when an admin actually changes it.
          ...(emailChanged && { email: values.email, currentPassword: values.currentPassword }),
        }),
      );
    } catch (error) {
      setFormError(
        applyServerErrors(error, setError, ['fullName', 'phone', 'email', 'currentPassword']),
      );
    }
  });

  return (
    <Modal open onClose={onClose} title="Edit profile">
      <form onSubmit={onSubmit} noValidate>
        {formError && (
          <div role="alert" className="alert alert-error alert-soft mb-2 text-sm">
            {formError}
          </div>
        )}
        <TextField
          label="Full name"
          placeholder="Your full name"
          autoComplete="name"
          required
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <TextField
          label="Phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="10–15 digits (optional)"
          error={errors.phone?.message}
          {...register('phone')}
        />
        {isAdmin ? (
          <TextField
            label="Email"
            placeholder="name@company.com"
            type="email"
            autoComplete="email"
            required
            hint="You sign in with this email."
            error={errors.email?.message}
            {...register('email')}
          />
        ) : (
          <TextField
            label="Email"
            type="email"
            value={user.email}
            readOnly
            className="bg-base-300/40"
            hint="You sign in with this email. Ask your admin to change it."
          />
        )}
        {emailChanged && (
          <PasswordField
            label="Current password"
            placeholder="Your current password"
            autoComplete="current-password"
            required
            hint="Needed to change your sign-in email."
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />
        )}

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
