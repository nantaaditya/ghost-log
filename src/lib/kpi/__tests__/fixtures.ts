import type { ImportPerson } from "../import-payload";

const DIMENSIONS = [
  ["A", "Ambition"],
  ["O", "Ownership"],
  ["R", "Resilience"],
  ["L", "Learning"],
  ["P", "People"],
  ["V", "Vision"],
] as const;

/** A valid, synthetic import record. Override fields to build edge cases. */
export function makePerson(overrides: Partial<ImportPerson> = {}): ImportPerson {
  return {
    nama: "Ana Tester",
    role: "QA",
    fingerprint: "a".repeat(64),
    scores: DIMENSIONS.map(([kode, dimensi], index) => ({ kode, dimensi, jumlah: index, total: 12 })),
    profile: {
      gaya_sosial: "Introvert",
      pemulihan: "Menyendiri",
      peran_tim: "Pendukung",
      motivator: "Makna",
      gaya_konflik: "Menghindar",
      kekuatan: "Teliti",
      growth: "Perfeksionis",
      energi: "Pagi",
    },
    answers: Array.from({ length: 22 }, (_, index) => ({
      q: `Q${index + 1}`,
      bagian: index < 12 ? "Career Growth" : index < 20 ? "Character" : "Terbuka",
      pertanyaan: `Pertanyaan ${index + 1}?`,
      jawaban: `Jawaban ${index + 1}`,
      kategori: "Resilience",
    })),
    memberSummary: undefined,
    goals: [],
    managerSummary: [{ judul: "Hipotesis", isi: "Isi hipotesis" }],
    managerDecisions: [{ judul: "Tanya Q1", isi: "Buka dengan Q1" }],
    ...overrides,
  };
}

export function makePayload(people: ImportPerson[] = [makePerson()]) {
  return { version: 1, cycleYear: 2026, generated: "2026-10-25T10:00:00", people };
}
