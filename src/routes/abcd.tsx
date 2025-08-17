import Elysia from "elysia";

export const POST = new Elysia().post("/abcd", async () => {
  return {
    ok: true,
    data: {
      hello: "world",
    },
  };
});

export default function Page() {
  return (
    <div>
      <h1>Hello World, this is the /abcd page</h1>
      <p>Yes, this is rendered on the website as SolidJS!</p>
    </div>
  );
}
