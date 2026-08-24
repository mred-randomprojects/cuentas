import type { Person } from "../types";

export function personName(people: Person[], id: string): string {
  return people.find((person) => person.id === id)?.name ?? "Persona borrada";
}

export function describeParticipants(people: Person[], ids: string[]): string {
  const names = ids.map((id) => personName(people, id)).filter(Boolean);
  if (!names.length) return "Sin participantes";
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} y ${names.length - 3} más`;
}

/**
 * Narrows a selection of participant ids down to people that still exist, in
 * the stored people order. Keeping one canonical order means the preview of a
 * split matches what gets saved, no matter in which order they were picked.
 */
export function selectedParticipantIds(
  people: Person[],
  selected: Set<string> | string[],
): string[] {
  const wanted = selected instanceof Set ? selected : new Set(selected);
  return people.map((person) => person.id).filter((id) => wanted.has(id));
}
