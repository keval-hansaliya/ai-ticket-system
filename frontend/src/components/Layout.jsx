import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar />
      <main className="flex-1 pb-16">
        <Outlet />
      </main>
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AutoResolve AI &copy; {new Date().getFullYear()} — Intelligent Doubt Resolution System</span>
          <span className="text-slate-600">Built with React 19, Express, MongoDB & Gemini AI</span>
        </div>
      </footer>
    </div>
  );
}
