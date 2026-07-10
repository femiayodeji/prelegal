import PlatformShell from "@/components/PlatformShell";
import NdaWorkspace from "@/components/NdaWorkspace";

// The platform landing page: a guarded app shell wrapping the (unchanged)
// Mutual NDA creator. PlatformShell handles the client-side login gate; the
// NdaWorkspace island holds the interactive form state.
export default function Home() {
  return (
    <PlatformShell>
      <NdaWorkspace />
    </PlatformShell>
  );
}
