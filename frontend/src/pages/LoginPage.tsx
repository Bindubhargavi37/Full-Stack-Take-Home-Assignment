import { zodResolver } from '@hookform/resolvers/zod';
import { ClipboardList, LogIn } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router';
import { loginSchema, type LoginInput } from 'shared';
import type { z } from 'zod';
import { applyServerErrors } from '@/components/form/applyServerErrors';
import { PasswordField } from '@/components/form/PasswordField';
import { TextField } from '@/components/form/TextField';
import { ThemePicker } from '@/components/layout/ThemePicker';
import { useAuth } from '@/hooks/useAuth';

// Shown only in development builds, to log in quickly with the seeded accounts.
const DEMO_ACCOUNTS = [
  { label: 'Fill admin demo', email: 'admin@example.com', password: 'Admin@12345' },
  { label: 'Fill agent demo', email: 'agent1@example.com', password: 'Agent@12345' },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput, unknown, z.output<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    // Check on submit, then live while fixing. (Checking on blur moved the button mid-click.)
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
      navigate(from, { replace: true });
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['email', 'password']));
      resetField('password');
    }
  });

  return (
    <div className="bg-base-200 flex min-h-screen flex-col">
      <header className="flex justify-end p-4">
        <ThemePicker />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="card bg-base-100 w-full max-w-sm shadow-xl">
          <form className="card-body gap-4" onSubmit={onSubmit} noValidate>
            <div className="text-center">
              <ClipboardList className="text-primary mx-auto mb-2 size-10" aria-hidden="true" />
              <h1 className="text-2xl font-bold">Sign in</h1>
              <p className="text-base-content/70 text-sm">Use the account your admin gave you.</p>
            </div>

            {formError && (
              <div role="alert" className="alert alert-error alert-soft text-sm">
                {formError}
              </div>
            )}

            <div>
              <TextField
                label="Email"
                type="email"
                autoComplete="username"
                placeholder="name@company.com"
                autoFocus
                required
                error={errors.email?.message}
                {...register('email')}
              />
              <PasswordField
                label="Password"
                autoComplete="current-password"
                required
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="loading loading-spinner loading-sm" aria-hidden="true" />
              ) : (
                <LogIn className="size-4" aria-hidden="true" />
              )}
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="text-base-content/60 text-center text-xs">
              Forgot your password? Ask your admin.
            </p>

            {import.meta.env.DEV && (
              <div className="border-base-300 flex gap-2 border-t pt-4">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    className="btn btn-ghost btn-xs flex-1"
                    onClick={() => {
                      setValue('email', account.email, { shouldValidate: true });
                      setValue('password', account.password, { shouldValidate: true });
                    }}
                  >
                    {account.label}
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
