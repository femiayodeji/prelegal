import PlatformShell from "@/components/PlatformShell";
import DocumentLibrary from "@/components/DocumentLibrary";

// The "My Documents" page: the guarded shell wrapping the saved-document list.
export default function DocumentsPage() {
  return (
    <PlatformShell>
      <DocumentLibrary />
    </PlatformShell>
  );
}
