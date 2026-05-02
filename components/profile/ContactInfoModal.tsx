'use client';

type Props = {
  open: boolean;
  onClose: () => void;
  contactEmail: string | null | undefined;
  contactPhone: string | null | undefined;
};

export default function ContactInfoModal({ open, onClose, contactEmail, contactPhone }: Props) {
  if (!open) return null;

  const email = String(contactEmail || '').trim();
  const phone = String(contactPhone || '').trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0d1113] p-5 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
      >
        <h2 id="contact-modal-title" className="text-xl font-bold">
          Contact
        </h2>

        <div className="mt-4 space-y-3 text-sm">
          {!email && !phone ? (
            <p className="text-zinc-400">No email or phone on file.</p>
          ) : null}
          {email ? (
            <div>
              <div className="text-xs uppercase tracking-wider text-zinc-500">Email</div>
              <a href={`mailto:${email}`} className="mt-1 block text-[#a855f7] hover:underline">
                {email}
              </a>
            </div>
          ) : null}
          {phone ? (
            <div>
              <div className="text-xs uppercase tracking-wider text-zinc-500">Phone</div>
              <a href={`tel:${phone.replace(/\s+/g, '')}`} className="mt-1 block text-[#a855f7] hover:underline">
                {phone}
              </a>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg border border-white/15 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/5"
        >
          Close
        </button>
      </div>
    </div>
  );
}
