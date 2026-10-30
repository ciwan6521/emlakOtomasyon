import { propertiesPack } from "./properties";
import { leadsPack } from "./leads";
import { customersPack } from "./customers";
import { insightsPack } from "./insights";
import { opsPack } from "./ops";
import { rentalsPack } from "./rentals";
import { socialPack } from "./social";
import { settingsPack } from "./settings";

/** Order matters only for duplicate keys, which the type system forbids. */
export const packs = [
  propertiesPack,
  leadsPack,
  customersPack,
  insightsPack,
  opsPack,
  rentalsPack,
  socialPack,
  settingsPack,
] as const;
