import { Link, useNavigate, useLocation } from "react-router-dom";
import { Sparkles, Ticket, Shield, LogOut, User as UserIcon } from "lucide-react";

export default function Navbar() {
  const token = localStorage.getItem("token");
  let user = localStorage.getItem("user");
  if (user) {
    try {
      user = JSON.parse(user);
    } catch {
      user = null;
    }
  }
  const navigate = useNavigate();
  const location = useLocation();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "moderator":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      default:
        return "bg-indigo-500/15 text-indigo-400 border-indigo-500/30";
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 bg-slate-950/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 group transition">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                AutoResolve<span className="text-indigo-400">AI</span>
              </span>
              <span className="hidden sm:block text-[10px] uppercase font-semibold text-slate-400 tracking-widest -mt-1">
                Triage Platform
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          {token && (
            <nav className="hidden md:flex items-center gap-1.5 ml-4">
              <Link
                to="/"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  location.pathname === "/"
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <Ticket className="w-4 h-4" />
                Tickets
              </Link>

              {user?.role === "admin" && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    location.pathname === "/admin"
                      ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Admin Panel
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* User / Auth Info */}
        <div className="flex items-center gap-3">
          {!token ? (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="px-4 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 transition"
              >
                Sign Up
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* User badge */}
              <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 rounded-full py-1 px-3">
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-indigo-400 border border-indigo-500/20">
                  {user?.email ? user.email[0].toUpperCase() : <UserIcon className="w-3 h-3" />}
                </div>
                <span className="text-xs font-medium text-slate-300 max-w-[140px] truncate hidden sm:inline">
                  {user?.email}
                </span>
                <span
                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${getRoleBadge(
                    user?.role
                  )}`}
                >
                  {user?.role || "user"}
                </span>
              </div>

              {/* Logout button */}
              <button
                onClick={logout}
                title="Log out"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
