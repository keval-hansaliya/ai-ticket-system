import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Trash2,
  RefreshCw,
  Sparkles,
  UserCheck,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ChevronDown,
  Loader2,
  X,
  FileText,
} from "lucide-react";

export default function TicketDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const token = localStorage.getItem("token");
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    user = null;
  }

  const fetchTicket = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/ticket/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setTicket(data.ticket);
      } else {
        setFeedback({ type: "error", message: data.message || "Failed to fetch ticket" });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", message: "Failed to connect to server" });
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    if (!ticket || ticket.status === newStatus) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/ticket/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (res.ok) {
        setTicket(data.ticket);
        setFeedback({ type: "success", message: `Status updated to ${newStatus}` });
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setFeedback({ type: "error", message: data.message || "Failed to update status" });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", message: "Error updating status" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/ticket/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        navigate("/");
      } else {
        setFeedback({ type: "error", message: data.message || "Failed to delete ticket" });
        setDeleting(false);
        setShowDeleteModal(false);
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", message: "Error deleting ticket" });
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const isCreator =
    user &&
    (ticket?.createdBy?._id === user._id ||
      ticket?.createdBy === user._id ||
      ticket?.createdBy?.email === user.email);

  const isAssigned =
    user &&
    (ticket?.assignedTo?._id === user._id ||
      ticket?.assignedTo?.email === user.email);

  const isAdmin = user?.role === "admin";
  const isModerator = user?.role === "moderator";

  const canEditStatus = isAdmin || isModerator || isCreator || isAssigned;
  const canDeleteTicket = isAdmin || isCreator;

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

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm font-medium">Loading ticket details...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-8 glass-panel rounded-2xl text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Ticket Not Found</h2>
        <p className="text-sm text-slate-400">
          This ticket may have been deleted or you do not have permission to view it.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tickets
        </Link>
      </div>
    );
  }

  const isTriagePending = ticket.status === "TODO" && !ticket.helpfulNotes;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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

      {/* Top Navigation & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition w-fit group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Tickets</span>
        </Link>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Refresh button */}
          <button
            onClick={() => fetchTicket(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition cursor-pointer"
            title="Refresh status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
            <span>Refresh</span>
          </button>

          {/* Status Changer */}
          {canEditStatus && (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-xs">
              <span className="text-slate-400 font-medium pl-1">Status:</span>
              <select
                value={ticket.status || "TODO"}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updatingStatus}
                className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer py-1 pr-2"
              >
                <option value="TODO" className="bg-slate-900">TODO</option>
                <option value="IN_PROGRESS" className="bg-slate-900">IN PROGRESS</option>
                <option value="RESOLVED" className="bg-slate-900">RESOLVED</option>
                <option value="CLOSED" className="bg-slate-900">CLOSED</option>
              </select>
              {updatingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />}
            </div>
          )}

          {/* Delete Ticket Button */}
          {canDeleteTicket && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Ticket</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Ticket Info Card */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
        {/* Badges & Meta */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${getStatusBadge(
                ticket.status
              )}`}
            >
              {ticket.status || "TODO"}
            </span>

            {ticket.priority && (
              <span
                className={`text-xs font-semibold uppercase px-2.5 py-1 rounded-full border ${getPriorityBadge(
                  ticket.priority
                )}`}
              >
                {ticket.priority} Priority
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            {ticket.createdAt && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{new Date(ticket.createdAt).toLocaleString()}</span>
              </div>
            )}
            {ticket.createdBy?.email && (
              <div className="text-slate-400">
                Created by: <span className="text-slate-300 font-medium">{ticket.createdBy.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
          {ticket.title}
        </h1>

        {/* Description */}
        <div className="space-y-2">
          <h4 className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
            Issue Description
          </h4>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
            {ticket.description}
          </div>
        </div>

        {/* Skills Identified */}
        {ticket.relatedSkills?.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs uppercase font-semibold text-slate-400 tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Required Skills
            </h4>
            <div className="flex flex-wrap gap-2">
              {ticket.relatedSkills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Triage / AI Pending Banner */}
      {isTriagePending && (
        <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Sparkles className="w-5 h-5 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-amber-200">AI Triage in Progress</h3>
            <p className="text-xs text-amber-300/80 leading-relaxed">
              Gemini AI is analyzing the ticket description, determining technical domain skills, estimating priority, and matching with the optimal moderator. Once processed, moderator troubleshooting notes and assignment will appear here.
            </p>
            <button
              onClick={() => fetchTicket(true)}
              className="mt-2 text-xs font-semibold text-amber-400 hover:text-amber-200 underline cursor-pointer"
            >
              Click here to check for updates
            </button>
          </div>
        </div>
      )}

      {/* Assigned Moderator & Resolution Playbook Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Moderator Card */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Assigned Mentor</h3>
          </div>

          {ticket.assignedTo ? (
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                  {ticket.assignedTo.email ? ticket.assignedTo.email[0].toUpperCase() : "M"}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-100">{ticket.assignedTo.email}</p>
                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                    ticket.relatedSkills?.length > 0
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}>
                    {ticket.relatedSkills?.length > 0 ? "Matched by AI Skills" : "Direct Assignment"}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                {ticket.relatedSkills?.length > 0
                  ? "This moderator has verified expertise in the skills identified for this doubt."
                  : "Assigned for manual triage and resolution."}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center py-6 text-slate-400 text-xs">
              <Clock className="w-6 h-6 mx-auto mb-2 text-slate-500" />
              <span>Pending moderator assignment</span>
            </div>
          )}
        </div>

        {/* AI Helpful Notes & Playbook (takes 2 cols) */}
        <div className="glass-card rounded-2xl p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-white text-base">AI Troubleshooting Playbook</h3>
            </div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
              For Moderators & Users
            </span>
          </div>

          {ticket.helpfulNotes ? (
            <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 text-sm leading-relaxed prose prose-invert max-w-none prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800">
              <ReactMarkdown>{ticket.helpfulNotes}</ReactMarkdown>
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-slate-900/50 border border-slate-800 text-center text-slate-400 text-xs">
              <FileText className="w-6 h-6 mx-auto mb-2 text-slate-500" />
              <span>No AI resolution notes generated yet. Check back soon.</span>
            </div>
          )}
        </div>
      </div>

      {/* CONFIRM DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl border border-rose-500/20 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-white">Delete Ticket?</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to permanently delete this ticket?
              </p>
              <p className="text-sm font-semibold text-slate-200 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 truncate">
                "{ticket.title}"
              </p>
              <p className="text-[11px] text-rose-400/80">
                This action cannot be undone and will remove it from all feeds.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-sm font-semibold text-white shadow-lg shadow-rose-600/30 transition disabled:opacity-50 cursor-pointer"
              >
                {deleting ? (
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