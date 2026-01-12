import type { SatoneConfig } from ".";
import { CONFIG_FILE, CONFIG_PATH } from "../utils/constants";

export const loadConfig = async (): Promise<SatoneConfig | undefined> => {
  if (await CONFIG_FILE.exists()) {
    const mod = await import(CONFIG_PATH);
    return mod.default;
  }
};
