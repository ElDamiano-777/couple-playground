export type Note = { id: string; text: string; createdAt: string };
const key = `ryadom.notes.v1`;

export function readNotes(): Note[] {
  const value: unknown = JSON.parse(localStorage.getItem(key) || `[]`);
  if (!Array.isArray(value) || !value.every(note => note && typeof note.id === `string` && typeof note.text === `string` && typeof note.createdAt === `string`)) {
    throw new Error(`Invalid saved notes`);
  }
  return value;
}

export function saveNotes(notes: Note[]) {
  localStorage.setItem(key, JSON.stringify(notes));
}
