import { McpProvider } from '@/lib/McpContext';
import { Sidebar } from '@/components/Sidebar';
import { ReaPane, CraftPane } from '@/components/Workspace';
import { Console } from '@/components/Console';

export default function App() {
  return (
    <McpProvider>
      <div className="h-screen w-screen flex flex-col bg-zinc-950 text-zinc-200 overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <main className="flex-1 flex overflow-hidden">
            <ReaPane />
            <CraftPane />
          </main>
        </div>
        <Console />
      </div>
    </McpProvider>
  );
}
