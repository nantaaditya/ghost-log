import { z } from "zod";
import { goalDraftSchema, MAX_CYCLE_YEAR, MIN_CYCLE_YEAR } from "./validation";

export const IMPORT_VERSION = 1;
export const MAX_IMPORT_PEOPLE = 200;
export const MAX_GOALS_PER_PERSON = 8;

const SCORE_COUNT = 6;
const ANSWER_COUNT = 22;
const MAX_SCORE = 12;
const MAX_INSIGHT_ITEMS = 8;
const MAX_PROFILE_KEYS = 12;

const insightItemSchema = z.object({
  judul: z.string().trim().min(1).max(200),
  isi: z.string().trim().min(1).max(1200),
});

const scoreSchema = z.object({
  kode: z.string().min(1).max(2),
  dimensi: z.string().min(1).max(40),
  jumlah: z.number().int().min(0).max(MAX_SCORE),
  total: z.number().int().min(1).max(MAX_SCORE),
});

const answerSchema = z.object({
  q: z.string().regex(/^Q\d{1,2}$/),
  bagian: z.string().max(40),
  pertanyaan: z.string().max(600),
  jawaban: z.string().max(3000),
  kategori: z.string().max(80),
});

const personSchema = z.object({
  nama: z.string().trim().min(1).max(100),
  role: z.string().trim().max(100).default(""),
  fingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  scores: z.array(scoreSchema).length(SCORE_COUNT),
  profile: z
    .record(z.string().max(40), z.string().max(200))
    .refine((value) => Object.keys(value).length <= MAX_PROFILE_KEYS, "Too many profile keys"),
  answers: z.array(answerSchema).length(ANSWER_COUNT),
  // Absent, null or blank all mean "not provided": a re-import then keeps what is already stored
  // instead of wiping a summary the manager wrote.
  memberSummary: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((value) => value || undefined),
  // Draft KPI goals, reviewed by the manager before import. Absent in older exports.
  goals: z.array(goalDraftSchema).max(MAX_GOALS_PER_PERSON).default([]),
  // Optional on purpose: an export that omits the notes must not erase notes already stored.
  // An explicit empty list still means "no notes".
  managerSummary: z.array(insightItemSchema).max(MAX_INSIGHT_ITEMS).optional(),
  managerDecisions: z.array(insightItemSchema).max(MAX_INSIGHT_ITEMS).optional(),
});

export const importPayloadSchema = z.object({
  version: z.literal(IMPORT_VERSION),
  cycleYear: z.number().int().min(MIN_CYCLE_YEAR).max(MAX_CYCLE_YEAR),
  // The year the proposed goals are planned for; defaults to the year after the survey.
  goalsCycleYear: z.number().int().min(MIN_CYCLE_YEAR).max(MAX_CYCLE_YEAR).optional(),
  generated: z.string().max(40),
  people: z.array(personSchema).min(1).max(MAX_IMPORT_PEOPLE),
});

export type ImportPayload = z.output<typeof importPayloadSchema>;
export type ImportPerson = z.output<typeof personSchema>;
