import type { PluginOption } from "vite";

export interface SatoneConfig {
  plugins?: Array<PluginOption>;
}

export const defineConfig = (config: SatoneConfig): SatoneConfig => config;
