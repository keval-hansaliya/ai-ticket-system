import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  PlusCircle,
  Search,
  Trash2,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  Tag,
  ArrowRight,
  Filter,
  RefreshCw,
  Loader2,
  X,
  HelpCircle,
} from "lucide-react";

export default function Tickets() {
  const [form, setForm] = useState({ title: "", description: "" });
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const token = localStorage.getItem("token");
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    user = null;
  }

  const isPrivileged = user?.role === "admin" || user?.role === "moderator";

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const url = `${import.meta.env.VITE_SERVER_URL}/ticket`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        method: "GET",
      });

      const data = await res.json();
      if (res.ok) {
        setTickets(data.tickets || []);
      } else {
        console.error("Failed to fetch tickets:", data.message);
      }
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/ticket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setForm({ title: "", description: "" });
        setShowCreateModal(false);
        setFeedback({
          type: "success",
          message: "Ticket submitted! AI triage agent is analyzing and assigning skills in background.",
        });
        setTimeout(() => setFeedback(null), 5000);
        fetchTickets();
      } else {
        setFeedback({ type: "error", message: data.message || "Ticket creation failed" });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", message: "Network error creating ticket" });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!ticketToDelete) return;
    setDeletingId(ticketToDelete._id);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/ticket/${ticketToDelete._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (res.ok) {
        setTickets((prev) => prev.filter((t) => t._id !== ticketToDelete._id));
        setFeedback({ type: "success", message: "Ticket successfully deleted." });
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setFeedback({ type: "error", message: data.message || "Failed to delete ticket." });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", message: "Error deleting ticket." });
    } finally {
      setDeletingId(null);
      setTicketToDelete(null);
    }
  };

  const canDelete = (ticket) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    const creatorId = ticket.createdBy?._id || ticket.createdBy;
    const creatorEmail = ticket.createdBy?.email;
    return (
      (creatorId && creatorId.toString() === user._id?.toString()) ||
      (creatorEmail && creatorEmail === user.email)
    );
  };

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Search text
      const matchesSearch =
        ticket.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.relatedSkills?.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const matchesStatus =
        statusFilter === "ALL" || ticket.status?.toUpperCase() === statusFilter.toUpperCase();

      // Assigned only (for moderator/admin)
      const matchesAssigned =
        !assignedOnly ||
        ticket.assignedTo?._id === user?._id ||
        ticket.assignedTo?.email === user?.email;

      return matchesSearch && matchesStatus && matchesAssigned;
    });
  }, [tickets, searchQuery, statusFilter, assignedOnly, user]);

  // Statistics
  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === "TODO" || t.status === "IN_PROGRESS").length;
    const resolved = tickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED").length;
    return { total, open, resolved };
  }, [tickets]);

  const getPriorityBadge = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "medium":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "low":
        return "bg-teal-500/15 text-teal-400 border-teal-500/30";
      default:
        return "bg-slate-700/40 text-slate-400 border-slate-700/50";
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case "RESOLVED":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "IN_PROGRESS":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "CLOSED":
        return "bg-slate-500/15 text-slate-400 border-slate-500/30";
      default:
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`fixed top-20 right-6 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium border backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300 ${
            feedback.type === "success"
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/40"
              : "bg-rose-950/90 text-rose-200 border-rose-500/40"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="ml-2 hover:opacity-75 cursor-pointer text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header section with Stats & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              {isPrivileged ? "Ticket Management Hub" : "My Support & Doubts"}
            </h1>
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
              <Sparkles className="w-3 h-3" />
              AI Powered
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Submit questions, track automated AI triage, and get matched to expert moderators.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTickets}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
            title="Refresh tickets"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/25 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Ticket</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Total Tickets</p>
            <h3 className="text-2xl font-bold text-white">{stats.total}</h3>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Active / Open</p>
            <h3 className="text-2xl font-bold text-white">{stats.open}</h3>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Resolved</p>
            <h3 className="text-2xl font-bold text-white">{stats.resolved}</h3>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tickets by title, description, or skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 ml-1 hidden sm:block" />
          {["ALL", "TODO", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === status
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
              }`}
            >
              {status === "ALL" ? "All Statuses" : status.replace("_", " ")}
            </button>
          ))}

          {/* Assigned to me toggle for moderators */}
          {user?.role === "moderator" && (
            <button
              onClick={() => setAssignedOnly(!assignedOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
                assignedOnly
                  ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/40"
                  : "bg-slate-900 text-slate-400 hover:text-white border-slate-800"
              }`}
            >
              Assigned to Me
            </button>
          )}
        </div>
      </div>

      {/* Tickets List */}
      <div>
        {loading && tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
            <p className="text-sm font-medium">Fetching tickets from server...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <HelpCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">No tickets found</h3>
            <p className="text-sm text-slate-400">
              {searchQuery || statusFilter !== "ALL"
                ? "No tickets match your search or filter criteria. Try clearing filters."
                : "You don't have any tickets yet. Create your first ticket to get help!"}
            </p>
            {searchQuery || statusFilter !== "ALL" ? (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setAssignedOnly(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-200 transition cursor-pointer"
              >
                Reset Filters
              </button>
            ) : (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white shadow-md shadow-indigo-600/30 transition cursor-pointer"
              >
                Create First Ticket
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTickets.map((ticket) => {
              const deletable = canDelete(ticket);

              return (
                <div
                  key={ticket._id}
                  className="glass-card rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5 group relative"
                >
                  <div>
                    {/* Top Row: Status & Priority Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                            ticket.status
                          )}`}
                        >
                          {ticket.status || "TODO"}
                        </span>
                        {ticket.priority && (
                          <span
                            className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full border ${getPriorityBadge(
                              ticket.priority
                            )}`}
                          >
                            {ticket.priority}
                          </span>
                        )}
                      </div>

                      {/* Delete button (visible if owner or admin) */}
                      {deletable && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setTicketToDelete(ticket);
                          }}
                          title="Delete ticket"
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Title */}
                    <Link to={`/tickets/${ticket._id}`}>
                      <h3 className="font-bold text-base text-white group-hover:text-indigo-300 transition line-clamp-2 mb-2">
                        {ticket.title}
                      </h3>
                    </Link>

                    {/* Description */}
                    <p className="text-slate-400 text-xs line-clamp-3 mb-4 leading-relaxed">
                      {ticket.description}
                    </p>

                    {/* Skills pills */}
                    {ticket.relatedSkills?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {ticket.relatedSkills.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-medium bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700/50"
                          >
                            {skill}
                          </span>
                        ))}
                        {ticket.relatedSkills.length > 3 && (
                          <span className="text-[10px] text-slate-500 self-center">
                            +{ticket.relatedSkills.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                      {ticket.assignedTo ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate text-slate-300">
                            {ticket.assignedTo.email}
                          </span>
                        </>
                      ) : (
                        <span className="text-amber-400/90 text-[11px] flex items-center gap-1">
                          <Sparkles className="w-3 h-3 animate-pulse" />
                          Triage in progress...
                        </span>
                      )}
                    </div>

                    <Link
                      to={`/tickets/${ticket._id}`}
                      className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium transition ml-2"
                    >
                      <span>Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE TICKET MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-xl rounded-2xl p-6 shadow-2xl border border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-indigo-400" />
                  Submit New Ticket
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Describe your doubt or technical issue clearly. AI will parse skills and assign a moderator.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Ticket Title
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. MongoDB replica set connection timeout in Docker container"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Issue Description & Error Details
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Provide context, error logs, reproduce steps, and what you've tried..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  Our AI Agent will analyze the stack, generate moderator solution notes, classify priority, and match with the qualified mentor in seconds.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Doubt</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {ticketToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl border border-rose-500/20 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-white">Delete Ticket?</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to permanently delete:
              </p>
              <p className="text-sm font-semibold text-slate-200 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 truncate">
                "{ticketToDelete.title}"
              </p>
              <p className="text-[11px] text-rose-400/80">This action cannot be undone.</p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setTicketToDelete(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deletingId !== null}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-sm font-semibold text-white shadow-lg shadow-rose-600/30 transition disabled:opacity-50 cursor-pointer"
              >
                {deletingId ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
