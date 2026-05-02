import type { AccountCategory, AccountType } from '@/lib/ruehl/accountTypes';
import { getCategoryLabel } from '@/lib/ruehl/accountTypes';

type Props = {
  accountType: AccountType | null | undefined;
  accountSubtype: AccountCategory | null | undefined;
  displayCategoryLabel: boolean | null | undefined;
};

export default function AccountTypeChip({ accountType, accountSubtype, displayCategoryLabel }: Props) {
  if (!displayCategoryLabel || !accountType || !accountSubtype) return null;
  if (accountSubtype === 'personal') return null;

  const label = getCategoryLabel(accountSubtype);

  return (
    <span className="inline-flex max-w-full items-center text-[12px] font-semibold uppercase tracking-wider text-zinc-500" title={label}>
      {label}
    </span>
  );
}
