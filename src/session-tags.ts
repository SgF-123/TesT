export const SESSION_TAG_PALETTE = [
  "mint",
  "blue",
  "amber",
  "red",
  "gray",
] as const;

export type SessionTagColor = (typeof SESSION_TAG_PALETTE)[number];

export type SessionTagDefinition = {
  id: string;
  name: string;
  color: SessionTagColor;
};

export type SessionTagStore = {
  tags: SessionTagDefinition[];
  assignments: Record<string, string[]>;
};

export const EMPTY_SESSION_TAG_STORE: SessionTagStore = {
  tags: [],
  assignments: {},
};

export const SESSION_TAG_STORAGE_KEY = "tesT.sessionTags.v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function makeTagId(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return `tag-${slug || "label"}-${Date.now().toString(36)}`;
}

export function normalizeTagName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 24);
}

export function findSessionTagByName(
  store: SessionTagStore,
  name: string,
) {
  const normalized = normalizeTagName(name).toLocaleLowerCase();
  return store.tags.find(
    (tag) => tag.name.toLocaleLowerCase() === normalized,
  );
}

export function addSessionTag(
  store: SessionTagStore,
  rawName: string,
): { store: SessionTagStore; tag: SessionTagDefinition | null } {
  const name = normalizeTagName(rawName);
  if (!name) {
    return { store, tag: null };
  }

  const existing = findSessionTagByName(store, name);
  if (existing) {
    return { store, tag: existing };
  }

  const tag: SessionTagDefinition = {
    id: makeTagId(name),
    name,
    color: SESSION_TAG_PALETTE[store.tags.length % SESSION_TAG_PALETTE.length],
  };
  return {
    store: { ...store, tags: [...store.tags, tag] },
    tag,
  };
}

export function assignedTagsForPath(
  store: SessionTagStore,
  path: string,
) {
  const ids = new Set(store.assignments[path] ?? []);
  return store.tags.filter((tag) => ids.has(tag.id));
}

export function toggleSessionTag(
  store: SessionTagStore,
  path: string,
  tagId: string,
) {
  if (!path || !store.tags.some((tag) => tag.id === tagId)) {
    return store;
  }

  const current = new Set(store.assignments[path] ?? []);
  if (current.has(tagId)) current.delete(tagId);
  else current.add(tagId);

  const assignments = { ...store.assignments };
  if (current.size) assignments[path] = [...current];
  else delete assignments[path];
  return { ...store, assignments };
}

export function assignSessionTag(
  store: SessionTagStore,
  path: string,
  tagId: string,
) {
  if (!path || !store.tags.some((tag) => tag.id === tagId)) {
    return store;
  }
  const current = new Set(store.assignments[path] ?? []);
  if (current.has(tagId)) return store;
  current.add(tagId);
  return {
    ...store,
    assignments: { ...store.assignments, [path]: [...current] },
  };
}

export function clearSessionTags(store: SessionTagStore, path: string) {
  if (!store.assignments[path]) return store;
  const assignments = { ...store.assignments };
  delete assignments[path];
  return { ...store, assignments };
}

export function sessionTagUsage(
  store: SessionTagStore,
): Record<string, number> {
  const usage: Record<string, number> = {};
  const validIds = new Set(store.tags.map((tag) => tag.id));
  for (const ids of Object.values(store.assignments)) {
    for (const id of new Set(ids)) {
      if (validIds.has(id)) usage[id] = (usage[id] ?? 0) + 1;
    }
  }
  return usage;
}

export function sessionHasTag(
  store: SessionTagStore,
  path: string,
  tagId: string,
) {
  return Boolean(path && store.assignments[path]?.includes(tagId));
}

export function readSessionTagStore(
  storage: StorageLike | null = typeof window === "undefined"
    ? null
    : window.localStorage,
): SessionTagStore {
  try {
    const raw = storage?.getItem(SESSION_TAG_STORAGE_KEY);
    if (!raw) return EMPTY_SESSION_TAG_STORE;
    const value = JSON.parse(raw) as Partial<SessionTagStore>;
    const tags = Array.isArray(value.tags)
      ? value.tags.filter(
          (tag): tag is SessionTagDefinition =>
            Boolean(tag) &&
            typeof tag.id === "string" &&
            typeof tag.name === "string" &&
            SESSION_TAG_PALETTE.includes(tag.color as SessionTagColor),
        )
      : [];
    const validIds = new Set(tags.map((tag) => tag.id));
    const assignments: Record<string, string[]> = {};
    if (value.assignments && typeof value.assignments === "object") {
      for (const [path, ids] of Object.entries(value.assignments)) {
        if (!path || !Array.isArray(ids)) continue;
        const clean = [
          ...new Set(ids.filter((id) => typeof id === "string" && validIds.has(id))),
        ];
        if (clean.length) assignments[path] = clean;
      }
    }
    return { tags, assignments };
  } catch {
    return EMPTY_SESSION_TAG_STORE;
  }
}

export function writeSessionTagStore(
  store: SessionTagStore,
  storage: StorageLike | null = typeof window === "undefined"
    ? null
    : window.localStorage,
) {
  try {
    storage?.setItem(SESSION_TAG_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Local storage can be unavailable or full; the in-memory state still works.
  }
}
