'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { RuehlProfile } from '@/lib/ruehl/types';
import type { VerificationSubmissionRecord } from '@/lib/ruehl/queries/verificationServer';
import {
  ACCOUNT_TYPE_LABELS,
  CATEGORIES_BY_TYPE,
  type AccountCategory,
  type AccountType,
} from '@/lib/ruehl/accountTypes';
import {
  VERIFICATION_ALLOWED_MIME_TYPES,
  VERIFICATION_BUCKET,
  VERIFICATION_MAX_DOCUMENT_BYTES,
  VERIFICATION_UI_COPY,
  buildVerificationDocumentPath,
  extractFileExtension,
  getVerificationApplySubcopy,
  isAllowedVerificationMimeType,
} from '@/lib/ruehl/verification';

type Props = {
  profile: RuehlProfile;
  onSubmitted: (submission: VerificationSubmissionRecord) => void;
};

const REQUIREMENTS_COPY: Record<AccountType, string> = {
  personal:
    'Government-issued ID matching your display name may be requested for creator verification in a future release.',
  business:
    'Provide legal incorporation, trademark, or official documents showing your company name matches your profile.',
  media:
    'Provide press credentials, masthead, FCC license, or a letter on official letterhead from your publication or station.',
};

export default function VerificationForm({ profile, onSubmitted }: Props) {
  const accountType = profile.account_type as AccountType | null;
  const defaultSubtype =
    accountType && CATEGORIES_BY_TYPE[accountType].includes(profile.account_subtype as AccountCategory)
      ? (profile.account_subtype as AccountCategory)
      : (accountType ? CATEGORIES_BY_TYPE[accountType][0] : 'brand');

  const [accountSubtype, setAccountSubtype] = useState<AccountCategory>(defaultSubtype);
  const [legalEntityName, setLegalEntityName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState(profile.website?.trim() || '');
  const [userNotes, setUserNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finishedRef = useRef(false);

  const subtypeOptions = useMemo(() => {
    if (!accountType) return [] as readonly AccountCategory[];
    return CATEGORIES_BY_TYPE[accountType];
  }, [accountType]);

  const accountLabel = accountType ? ACCOUNT_TYPE_LABELS[accountType] : 'Account';

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting || finishedRef.current || !accountType) return;

      setSubmitting(true);
      setError(null);

      try {
        if (!legalEntityName.trim() || legalEntityName.trim().length < 2) {
          throw new Error('Legal entity name is required.');
        }
        if (!files.length) {
          throw new Error('Upload at least one verification document.');
        }

        const paths: string[] = [];
        for (const file of files) {
          if (file.size > VERIFICATION_MAX_DOCUMENT_BYTES) {
            throw new Error(`"${file.name}" exceeds the ${VERIFICATION_MAX_DOCUMENT_BYTES / (1024 * 1024)} MB limit.`);
          }
          const mime = file.type || 'application/octet-stream';
          if (!isAllowedVerificationMimeType(mime)) {
            throw new Error(`"${file.name}" must be JPG, PNG, HEIC, or PDF.`);
          }
          const storagePath = buildVerificationDocumentPath(profile.id, extractFileExtension(file.name));
          const { error: upErr } = await supabase.storage.from(VERIFICATION_BUCKET).upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: mime,
          });
          if (upErr) throw new Error(upErr.message || 'Upload failed');
          paths.push(storagePath);
        }

        const document_path = paths.join('|');

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error('You must be signed in to submit.');

        const res = await fetch('/api/verification-requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            account_type: accountType,
            account_subtype: accountSubtype,
            legal_entity_name: legalEntityName.trim(),
            website_url: websiteUrl.trim() || null,
            user_notes: userNotes.trim() || null,
            document_path,
          }),
        });

        const body = (await res.json().catch(() => ({}))) as { error?: string; item?: VerificationSubmissionRecord };

        if (!res.ok) {
          throw new Error(body.error || 'Submission failed');
        }

        if (!body.item) {
          throw new Error('Invalid response from server');
        }

        finishedRef.current = true;
        onSubmitted(body.item);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Something went wrong';
        setError(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [
      accountType,
      accountSubtype,
      files,
      legalEntityName,
      onSubmitted,
      profile.id,
      userNotes,
      websiteUrl,
      submitting,
    ],
  );

  if (!accountType) return null;

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      <p className="text-sm leading-relaxed text-zinc-400">{getVerificationApplySubcopy(accountLabel)}</p>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-300">
        <p className="mb-1 font-semibold text-white">Account type: {accountLabel}</p>
        <p className="text-zinc-400">{REQUIREMENTS_COPY[accountType]}</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-200">{VERIFICATION_UI_COPY.legalEntityLabel}</label>
        <input
          type="text"
          value={legalEntityName}
          onChange={(e) => setLegalEntityName(e.target.value)}
          required
          autoComplete="organization"
          placeholder={VERIFICATION_UI_COPY.legalEntityPlaceholder}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder:text-zinc-600"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-200">Category</label>
        <select
          value={accountSubtype}
          onChange={(e) => setAccountSubtype(e.target.value as AccountCategory)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
        >
          {subtypeOptions.map((cat) => (
            <option key={cat} value={cat}>
              {cat.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-200">{VERIFICATION_UI_COPY.websiteLabel}</label>
        <input
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder={VERIFICATION_UI_COPY.websitePlaceholder}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder:text-zinc-600"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-200">{VERIFICATION_UI_COPY.notesLabel}</label>
        <textarea
          value={userNotes}
          onChange={(e) => setUserNotes(e.target.value)}
          rows={4}
          placeholder={VERIFICATION_UI_COPY.notesPlaceholder}
          className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder:text-zinc-600"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-200">{VERIFICATION_UI_COPY.documentSectionLabel}</label>
        <input
          type="file"
          accept={[...VERIFICATION_ALLOWED_MIME_TYPES].join(',')}
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-sm file:text-white"
        />
        <p className="mt-1 text-xs text-zinc-500">{VERIFICATION_UI_COPY.tapToUploadSubtitle}</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      ) : null}

      <button
        type="submit"
        disabled={
          submitting ||
          finishedRef.current ||
          !legalEntityName.trim() ||
          files.length === 0
        }
        className="w-full rounded-lg bg-[#a855f7] py-3 font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
      >
        {submitting ? VERIFICATION_UI_COPY.submittingCta : VERIFICATION_UI_COPY.submitCta}
      </button>

      <p className="text-center text-xs text-zinc-500">{VERIFICATION_UI_COPY.requiredFootnote}</p>
      <p className="text-center text-xs text-zinc-600">
        By submitting, you confirm the information is accurate. False claims may result in account suspension.
      </p>
    </form>
  );
}
