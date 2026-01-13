import { treaty } from "@elysiajs/eden";

// @ts-expect-error : if this runs on the server, let's forget...
const origin: string = typeof window !== "undefined" ? window.location.origin : undefined;

// @ts-expect-error : only defined in user's project, thanks to tsconfig.json
//                    and generated `.satone` files
export const client = (origin ? treaty<SatoneServerRoutes>(origin) : void 0)!;
