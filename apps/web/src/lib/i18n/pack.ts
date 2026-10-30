/**
 * A message pack is a set of UI strings for one feature area, in all four
 * locales. `en` is the source of truth for the key set; the other locales must
 * provide every key (enforced by the type), so a missing translation is a
 * compile error rather than an English string leaking into the UI.
 *
 * Packs live in `./packs/*.ts` and are merged in `./messages.ts`.
 */
export interface MessagePack<K extends string> {
  en: Record<K, string>;
  me: Record<K, string>;
  tr: Record<K, string>;
  ru: Record<K, string>;
}

export function definePack<K extends string>(
  en: Record<K, string>,
  rest: { me: Record<K, string>; tr: Record<K, string>; ru: Record<K, string> },
): MessagePack<K> {
  return { en, ...rest };
}
