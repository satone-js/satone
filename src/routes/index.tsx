import Elysia from "elysia";
import { createSignal } from "solid-js";
import { aa } from "../utils/hehe";

export const PUT: any = new Elysia().put("/", async () => {
  return {
    hello: "world",
    aa,
  };
});
export const POST = new Elysia().post("/", "post hello world");

// export default function Page() {
//   const [count, setCount] = createSignal(0);

//   return (
//     <div>
//       <button type="button" onClick={() => setCount((prev) => prev - 1)}>
//         -1
//       </button>
//       <p>CURRENT: {count()}</p>
//       <button type="button" onClick={() => setCount((prev) => prev + 1)}>
//         +1
//       </button>
//     </div>
//   );
// }

export const GET = new Elysia().get("/", "hello world!");
