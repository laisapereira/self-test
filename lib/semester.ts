// Semester 1 = March–July, Semester 2 = August–February (year of August start)
export function getSemester(date: Date): string {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  if (month >= 1 && month <= 7) return `${year}.1`;
  if (month >= 8) return `${year}.2`;
  return `${year - 1}.2`;
}

export function groupBySemester<T>(
  items: T[],
  getDate: (item: T) => Date,
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = getSemester(getDate(item));
    groups[key] = groups[key] ?? [];
    groups[key].push(item);
  }
  return groups;
}

export function sortedSemesters(semesters: string[]): string[] {
  return [...semesters].sort((a, b) => {
    const [ya, sa] = a.split(".");
    const [yb, sb] = b.split(".");
    return ya !== yb ? Number(yb) - Number(ya) : Number(sb) - Number(sa);
  });
}
