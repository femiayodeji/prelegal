import NdaWorkspace from "@/components/NdaWorkspace";

// Server component: the interactive pieces live in the NdaWorkspace client
// island so the page itself ships no client JS of its own.
export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <NdaWorkspace />
    </main>
  );
}
