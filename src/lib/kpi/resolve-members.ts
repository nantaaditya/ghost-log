export interface ImportUser {
  id: string;
  name: string;
  email: string;
  status: string;
}

/** Name → email overrides, for people whose survey name differs from their account name. */
export type NameMapping = Readonly<Record<string, string>>;

export interface Resolution {
  matched: ReadonlyArray<{ index: number; userId: string }>;
  problems: ReadonlyArray<string>;
}

const ACTIVE = "active";

/** Case-, whitespace- and width-insensitive form used to compare names. */
export function normalizeName(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

type Pick = { user: ImportUser } | { problem: string };

function pickByMapping(nama: string, email: string, byEmail: Map<string, ImportUser>): Pick {
  const user = byEmail.get(email);
  if (!user) return { problem: `"${nama}" is mapped to ${email}, but no user has that email` };
  if (user.status !== ACTIVE) return { problem: `"${nama}" is mapped to ${email}, who is not active` };
  return { user };
}

function pickByName(nama: string, candidates: ImportUser[]): Pick {
  const active = candidates.filter((user) => user.status === ACTIVE);
  if (active.length === 1) return { user: active[0] };

  if (active.length > 1) {
    const emails = active.map((user) => user.email).join(", ");
    return { problem: `More than one active user is named "${nama}" (${emails}); add a mapping to choose` };
  }
  if (candidates.length > 0) {
    const emails = candidates.map((user) => user.email).join(", ");
    return { problem: `"${nama}" matches a user who is not active (${emails})` };
  }
  return { problem: `No active user is named "${nama}"; add a mapping if the name differs` };
}

/**
 * Matches survey respondents to app users. Never guesses: an unknown, ambiguous or inactive
 * match is reported as a problem, and the caller is expected to import nothing if any exist.
 */
export function resolveMembers(
  people: ReadonlyArray<{ nama: string }>,
  users: ReadonlyArray<ImportUser>,
  mapping: NameMapping = {},
): Resolution {
  const emailByName = new Map(
    Object.entries(mapping).map(([name, email]) => [normalizeName(name), email.trim().toLowerCase()]),
  );
  const userByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]));
  const usersByName = new Map<string, ImportUser[]>();
  for (const user of users) {
    const key = normalizeName(user.name);
    usersByName.set(key, [...(usersByName.get(key) ?? []), user]);
  }

  const matched: Array<{ index: number; userId: string }> = [];
  const problems: string[] = [];
  const seenNames = new Set<string>();
  const claimedBy = new Map<string, string>();

  people.forEach((person, index) => {
    const key = normalizeName(person.nama);
    if (seenNames.has(key)) {
      problems.push(`"${person.nama}" appears more than once in the export`);
      return;
    }
    seenNames.add(key);

    const mappedEmail = emailByName.get(key);
    const picked = mappedEmail
      ? pickByMapping(person.nama, mappedEmail, userByEmail)
      : pickByName(person.nama, usersByName.get(key) ?? []);
    if ("problem" in picked) {
      problems.push(picked.problem);
      return;
    }

    const earlier = claimedBy.get(picked.user.id);
    if (earlier) {
      problems.push(`"${person.nama}" and "${earlier}" resolve to the same user (${picked.user.email})`);
      return;
    }
    claimedBy.set(picked.user.id, person.nama);
    matched.push({ index, userId: picked.user.id });
  });

  return { matched, problems };
}
