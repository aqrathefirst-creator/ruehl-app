'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { GovernedRequestSubject } from '@/lib/admin/executeRequest';

type RequestModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    subject: GovernedRequestSubject;
    target_id: string;
    notes: string;
    attachment_url?: string;
  }) => Promise<void>;
  initialSubject?: GovernedRequestSubject;
  initialTargetId?: string;
};

const SUBJECTS: GovernedRequestSubject[] = [
  'VERIFY_USER',
  'SHADOW_BAN_USER',
  'RESTRICT_USER',
  'DELETE_USER',
  'CHANGE_USERNAME',
  'CHANGE_EMAIL',
  'CHANGE_SECURITY_SETTINGS',
  'ADD_GENRE',
  'REMOVE_GENRE',
  'MODIFY_GENRE',
  'OVERRIDE_CHART',
  'REMOVE_DISCOVERY',
  'BOOST_PROMOTE_CONTENT',
  'DELETE_CONTENT',
  'MODIFY_MUSIC_METADATA',
  'SECURITY_CHANGE',
  'OTHER',
];

export default function RequestModal({
  open,
  onClose,
  onSubmit,
  initialSubject = 'OTHER',
  initialTargetId = '',
}: RequestModalProps) {
  const [subject, setSubject] = useState<GovernedRequestSubject>(initialSubject);
  const [targetId, setTargetId] = useState(initialTargetId);
  const [notes, setNotes] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSubject(initialSubject);
    setTargetId(initialTargetId);
    setNotes('');
    setAttachmentUrl('');
    setAttachmentFile(null);
    setError(null);
  }, [open, initialSubject, initialTargetId]);

  if (!open) return null;

  const uploadAttachment = async () => {
    if (!attachmentFile) return attachmentUrl.trim() || undefined;

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) throw new Error('Missing auth session');

    const ext = attachmentFile.name.includes('.') ? attachmentFile.name.split('.').pop() : 'bin';
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const upload = await supabase.storage
      .from('admin-request-attachments')
      .upload(path, attachmentFile, { upsert: false });

    if (upload.error) throw new Error(upload.error.message || 'Attachment upload failed');

    const { data } = supabase.storage.from('admin-request-attachments').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    setError(null);

    if (!targetId.trim()) {
      setError('Target ID is required.');
      return;
    }

    if (!notes.trim()) {
      setError('Notes are required.');
      return;
    }

    setSaving(true);

    try {
      const uploadedAttachmentUrl = await uploadAttachment();
      await onSubmit({
        subject,
        target_id: targetId.trim(),
        notes: notes.trim(),
        attachment_url: uploadedAttachmentUrl,
      });
      onClose();
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit request');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-[#0d1113] p-5 text-white shadow-2xl">
        <h3 className="text-xl font-bold">Submit Governance Request</h3>
        <p className="mt-1 text-sm text-gray-400">Critical actions require root admin approval.</p>

        <div className="mt-4 space-y-3">
          <label className="block text-xs uppercase tracking-[0.16em] text-gray-400">Subject</label>
          <select
            value={subject}
            onChange={(event) => setSubject(event.target.value as GovernedRequestSubject)}
            className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
          >
            {SUBJECTS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <label className="block text-xs uppercase tracking-[0.16em] text-gray-400">Target ID</label>
          <input
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
            placeholder="user_id, post_id, genre_name, etc"
            className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
          />

          <label className="block text-xs uppercase tracking-[0.16em] text-gray-400">Notes</label>
          <textarea
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Provide full justification and impact context"
            className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
          />

          <label className="block text-xs uppercase tracking-[0.16em] text-gray-400">Attachment (optional)</label>
          <input
            type="file"
            onChange={(event) => setAttachmentFile(event.target.files?.[0] || null)}
            className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
          />
          <input
            value={attachmentUrl}
            onChange={(event) => setAttachmentUrl(event.target.value)}
            placeholder="or paste attachment URL"
            className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
          />

          {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-200">Cancel</button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg border border-cyan-400/35 bg-cyan-500/20 px-4 py-2 text-sm text-cyan-200 disabled:opacity-60"
          >
            {saving ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}
