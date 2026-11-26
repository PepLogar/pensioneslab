/** Shared cohort state, free of country data. */
export function cohort(birthYear, size, sex) {
  return { birthYear, size, sex, retired: false, hasWorked: false,
    legacyAnnual: 0, paygAnnual: 0, ndcBalance: 0, fundedAssets: 0,
    ndcAnnual: 0, fundedAnnual: 0 };
}

