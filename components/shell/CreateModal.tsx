'use client';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CreateModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[var(--bg-secondary)] p-6 text-center"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-modal-title"
      >
        <h2 id="create-modal-title" className="mb-2 text-xl font-bold text-[var(--text-primary)]">
          Create in the Ruehl app
        </h2>
        <p className="mb-6 text-[var(--text-muted)]">Posting and dropping happens in the iOS app.</p>
        <a
          href="https://apps.apple.com/app/ruehl"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-full bg-[#a855f7] px-6 py-3 font-medium text-white hover:brightness-110"
        >
          Get the app
        </a>
        <button
          type="button"
          onClick={onClose}
          className="mx-auto mt-3 block text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
