'use client';

import type { AccountCategory, AccountType } from '@/lib/ruehl/accountTypes';
import { getCategoryLabel } from '@/lib/ruehl/accountTypes';

type Props = {
  accountType: AccountType | null | undefined;
  accountCategory: AccountCategory | null | undefined;
  displayCategoryLabel: boolean | null | undefined;
};

export default function AccountTypeChip({ accountType, accountCategory, displayCategoryLabel }: Props) {
  if (!displayCategoryLabel || !accountType || !accountCategory) return null;
  if (accountCategory === 'personal') return null;

  const label = getCategoryLabel(accountCategory);

  return (
    <span
      className="inline-flex max-w-full items-center rounded-[var(--radius-pill)] border border-[var(--border-medium)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[12px] font-semibold text-[var(--text-secondary)]"
      title={label}
    >
      {label}
    </span>
  );
}
