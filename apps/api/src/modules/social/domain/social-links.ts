import { SocialChannel } from "@reos/shared";

/**
 * `SocialPost.externalRefs` stores, per channel, the platform media/post id
 * under the channel key and the public permalink under `<CHANNEL>_URL`.
 * Older rows only have the id; Facebook ids can still be turned into a URL,
 * Instagram numeric ids cannot (the permalink needs the shortcode).
 */
export type ExternalRefs = Record<string, string>;

export function urlKey(channel: SocialChannel): string {
  return `${channel}_URL`;
}

export function socialPostUrl(
  refs: ExternalRefs | null | undefined,
  channel: SocialChannel,
): string | null {
  if (!refs) return null;
  const url = refs[urlKey(channel)];
  if (url) return url;
  const id = refs[channel];
  if (!id || id.startsWith("sim_")) return null;
  if (channel === SocialChannel.FACEBOOK)
    return `https://www.facebook.com/${id}`;
  return null;
}
