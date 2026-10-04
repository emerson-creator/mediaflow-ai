import type { MediaItem } from "../types";

export interface DayGroup {
  label: "Today" | "Yesterday" | "Earlier";
  items: MediaItem[];
}

/** Agrupa por día local. Espera `items` ya ordenados del más nuevo al más viejo. */
export function groupByDay(items: MediaItem[]): DayGroup[] {
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  ).getTime();

  const groups: DayGroup[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Earlier", items: [] },
  ];

  for (const item of items) {
    const created = new Date(item.createdAt).getTime();
    if (created >= today) groups[0].items.push(item);
    else if (created >= yesterday) groups[1].items.push(item);
    else groups[2].items.push(item);
  }

  return groups.filter((group) => group.items.length > 0);
}
