import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gis-bg text-gis-text">
      <Header />
      <div className="flex-1 min-h-0 flex">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-hidden bg-gis-bg">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
