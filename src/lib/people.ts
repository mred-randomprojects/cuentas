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
