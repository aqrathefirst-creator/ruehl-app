import { requireUser } from '@/lib/server/supabase';
import { jsonError, jsonOk } from '@/lib/server/responses';
import type { AccountCategory, AccountType } from '@/lib/ruehl/accountTypes';
import { isCategoryValidForType } from '@/lib/ruehl/accountTypes';
import { updateProfileDisplay } from '@/lib/ruehl/mutations/updateProfileDisplay';

type RpcTier = 'PERSONAL' | 'BUSINESS' | 'MEDIA';

function toRpcTier(t: AccountType): RpcTier {
  if (t === 'business') return 'BUSINESS';
  if (t === 'media') return 'MEDIA';
  return 'PERSONAL';
}

function isRpcMissingError(message: string): boolean {
  return /does not exist|undefined_function|42883|schema cache/i.test(message);
}

export async function POST(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as {
    account_type?: unknown;
    account_subtype?: unknown;
  } | null;
  if (!body) return jsonError('Invalid body', 400);

  const rawType = String(body.account_type ?? '').trim().toLowerCase();
  if (rawType !== 'personal' && rawType !== 'business' && rawType !== 'media') {
    return jsonError('account_type must be personal, business, or media', 400);
  }
  const accountType = rawType as AccountType;

  const rawSub = String(body.account_subtype ?? '').trim().toLowerCase();
  if (!isCategoryValidForType(accountType, rawSub as AccountCategory)) {
    return jsonError('account_subtype is not valid for this account_type', 400);
  }
  const accountSubtype = rawSub as AccountCategory;

  const rpcTier = toRpcTier(accountType);

  const { error: rpcError } = await auth.supabase.rpc('switch_account_type', {
    p_account_type: rpcTier,
    p_account_subtype: accountSubtype,
    p_is_private: null,
  });

  if (!rpcError) {
    return jsonOk({ ok: true });
  }

  if (!isRpcMissingError(rpcError.message)) {
    return jsonError(rpcError.message, 400);
  }

  const pickedAt = new Date().toISOString();
  const { error: userErr } = await auth.supabase
    .from('users')
    .update({
      account_type: rpcTier,
      account_subtype: accountSubtype,
    })
    .eq('id', auth.user.id);

  if (userErr) {
    return jsonError(userErr.message, 400);
  }

  const { error: displayErr } = await updateProfileDisplay(auth.supabase, auth.user.id, {
    category_picked_at: pickedAt,
  });

  if (displayErr) {
    return jsonError(displayErr.message, 400);
  }

  return jsonOk({ ok: true });
}
