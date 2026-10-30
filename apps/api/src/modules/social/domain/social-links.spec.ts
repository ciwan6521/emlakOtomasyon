import { SocialChannel } from "@reos/shared";
import { socialPostUrl, urlKey } from "./social-links";

describe("socialPostUrl", () => {
  it("prefers the stored permalink", () => {
    const refs = {
      INSTAGRAM: "17895695668004550",
      [urlKey(SocialChannel.INSTAGRAM)]: "https://www.instagram.com/p/CxYz/",
    };
    expect(socialPostUrl(refs, SocialChannel.INSTAGRAM)).toBe(
      "https://www.instagram.com/p/CxYz/",
    );
  });

  it("derives a Facebook URL from a legacy post id", () => {
    expect(socialPostUrl({ FACEBOOK: "123_456" }, SocialChannel.FACEBOOK)).toBe(
      "https://www.facebook.com/123_456",
    );
  });

  it("cannot derive an Instagram URL from a bare media id", () => {
    expect(
      socialPostUrl({ INSTAGRAM: "17895695668004550" }, SocialChannel.INSTAGRAM),
    ).toBeNull();
  });

  it("never links simulated posts", () => {
    expect(
      socialPostUrl({ INSTAGRAM: "sim_INSTAGRAM_1" }, SocialChannel.INSTAGRAM),
    ).toBeNull();
    expect(
      socialPostUrl({ FACEBOOK: "sim_FACEBOOK_1" }, SocialChannel.FACEBOOK),
    ).toBeNull();
  });

  it("handles missing refs", () => {
    expect(socialPostUrl(null, SocialChannel.INSTAGRAM)).toBeNull();
    expect(socialPostUrl({}, SocialChannel.FACEBOOK)).toBeNull();
  });
});
