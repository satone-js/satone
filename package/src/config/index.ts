import type { InlineConfig as Vite } from "vite";

export interface SatoneConfig {
  define?: Vite["define"];
  plugins?: Vite["plugins"];
}

export const defineConfig = (config: SatoneConfig): SatoneConfig => config;
