import { CheckCircle2, KeyRound, Pencil } from 'lucide-react';
import { useState } from 'react';
import { ROLE_LABELS } from 'shared';
import { ChangePasswordDialog } from '@/features/profile/ChangePasswordDialog';
import { EditProfileDialog } from '@/features/profile/EditProfileDialog';
import { useAuth } from '@/hooks/useAuth';

function formatDateTime(iso: string | null) {
  return iso ? new Date(iso).toLocaleString() : 'Never';
}

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      {success && (
        <div role="status" className="alert alert-success alert-soft">
          <CheckCircle2 className="size-5" aria-hidden="true" />
          {success}
        </div>
      )}

      <section className="card bg-base-200" aria-labelledby="account-heading">
        <div className="card-body">
          <h2 id="account-heading" className="card-title text-lg">
            Account
          </h2>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {[
              ['Name', user.fullName],
              ['Email', user.email],
              ['Role', ROLE_LABELS[user.role]],
              ['Phone', user.phone ?? '—'],
              ['Last sign-in', formatDateTime(user.lastLoginAt)],
            ].map(([term, value]) => (
              <div key={term}>
                <dt className="text-base-content/60 text-sm">{term}</dt>
                <dd className="font-medium break-words">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="card-actions mt-4 justify-end">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setSuccess(null);
                setEditOpen(true);
              }}
            >
              <Pencil className="size-4" aria-hidden="true" />
              Edit profile
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setSuccess(null);
                setPasswordDialogOpen(true);
              }}
            >
              <KeyRound className="size-4" aria-hidden="true" />
              Change password
            </button>
          </div>
        </div>
      </section>

      {editOpen && (
        <EditProfileDialog
          user={user}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            // Updates the name in the top bar and menu straight away.
            setUser(updated);
            setEditOpen(false);
            setSuccess('Your profile was updated.');
          }}
        />
      )}

      <ChangePasswordDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
        onChanged={setSuccess}
      />
    </div>
  );
}
