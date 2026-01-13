import type { InlineConfig as Vite } from "vite";

export interface SatoneConfig {
  define?: Vite["define"];
  plugins?: Vite["plugins"];
  swagger?: SatoneSwaggerConfig;
}

export interface SatoneSwaggerConfig {
  path: string;
}

export const defineConfig = (config: SatoneConfig): SatoneConfig => config;
