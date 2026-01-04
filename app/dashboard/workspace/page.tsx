import { Suspense } from "react";
import WorkspaceClient from "./WorkspaceClient";

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-300">Loading workspace...</div>}>
      <WorkspaceClient />
    </Suspense>
  );
}