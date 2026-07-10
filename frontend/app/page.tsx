import PlatformShell from "@/components/PlatformShell";
import DocWorkspace from "@/components/DocWorkspace";

// The platform landing page: a guarded app shell wrapping the legal document
// creator. PlatformShell handles the client-side login gate; the DocWorkspace
// island holds the interactive chat + document state.
export default function Home() {
  return (
    <PlatformShell>
      <DocWorkspace />
    </PlatformShell>
  );
}
