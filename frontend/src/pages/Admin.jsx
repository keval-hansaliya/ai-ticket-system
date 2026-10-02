import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Users,
  Ticket,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  UserCheck,
  Tag,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tickets"); // "tickets" or "users"
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ role: "", skills: "" });
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [deletingTicketId, setDeletingTicketId] = useState(null);
  const [updatingUser, setUpdatingUser] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const token = localStorage.getItem("token");

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/ticket`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error("Error fetching tickets", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data || []);
      }
    } catch (err) {
      console.error("Error fetching users", err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchTickets(), fetchUsers()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEditClick = (user) => {
    setEditingUser(user.email);
    setFormData({
      role: user.role,
      skills: user.skills?.join(", ") || "",
    });
  };

  const handleUpdate = async () => {
    setUpdatingUser(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/auth/update-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: editingUser,
            role: formData.role,
            skills: formData.skills
              .split(",")
              .map((skill) => skill.trim())
              .filter(Boolean),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", message: data.error || "Failed to update user" });
        return;
      }

      setFeedback({ type: "success", message: `User ${editingUser} updated successfully` });
      setTimeout(() => setFeedback(null), 4000);
      setEditingUser(null);
      setFormData({ role: "", skills: "" });
      fetchUsers();
    } catch (err) {
      console.error("Update failed", err);
      setFeedback({ type: "error", message: "Failed to update user" });
    } finally {
      setUpdatingUser(false);
    }
  };

  const confirmDeleteTicket = async () => {
    if (!ticketToDelete) return;
    setDeletingTicketId(ticketToDelete._id);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/ticket/${ticketToDelete._id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      if (res.ok) {
        setTickets((prev) => prev.filter((t) => t._id !== ticketToDelete._id));
        setFeedback({ type: "success", message: "Ticket successfully removed" });
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setFeedback({ type: "error", message: data.message || "Failed to delete ticket" });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", message: "Error deleting ticket" });
    } finally {
      setDeletingTicketId(null);
      setTicketToDelete(null);
    }
  };

  const filteredTickets = useMemo(() => {
    if (!searchQuery) return tickets;
    const q = searchQuery.toLowerCase();
    return tickets.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.createdBy?.email?.toLowerCase().includes(q) ||
        t.assignedTo?.email?.toLowerCase().includes(q)
    );
  }, [tickets, searchQuery]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q) ||
        u.skills?.some((s) => s.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Admin Control Center</h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Oversee system tickets, manage user permissions, and configure skill tags for automated routing.
          </p>
        </div>

        {/* Stats Summary */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400">Total Users: </span>
            <span className="font-bold text-white">{users.length}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400">Total Tickets: </span>
            <span className="font-bold text-white">{tickets.length}</span>
          </div>
        </div>
      </div>

      {/* Tab Switcher & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800 w-fit">
          <button
            onClick={() => {
              setActiveTab("tickets");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === "tickets"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>All Tickets ({tickets.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("users");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === "users"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Manage Users ({users.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeTab === "tickets" ? "Search tickets..." : "Search users..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
          <p className="text-sm font-medium">Loading admin data...</p>
        </div>
      ) : activeTab === "tickets" ? (
        /* TICKETS TAB */
        <div className="space-y-4">
          {filteredTickets.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl text-center text-slate-400 text-sm">
              No tickets found matching your query.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket._id}
                  className="glass-card rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                          ticket.status
                        )}`}
                      >
                        {ticket.status || "TODO"}
                      </span>
                      {ticket.priority && (
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${getPriorityBadge(
                            ticket.priority
                          )}`}
                        >
                          {ticket.priority}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <Link to={`/tickets/${ticket._id}`}>
                      <h3 className="font-bold text-white text-base hover:text-indigo-300 transition">
                        {ticket.title}
                      </h3>
                    </Link>

                    <p className="text-xs text-slate-400 line-clamp-2">{ticket.description}</p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                      {ticket.createdBy?.email && (
                        <span>
                          Author: <strong className="text-slate-300">{ticket.createdBy.email}</strong>
                        </span>
                      )}
                      {ticket.assignedTo && (
                        <span className="flex items-center gap-1 text-emerald-400 font-medium">
                          <UserCheck className="w-3.5 h-3.5" />
                          Assigned: {ticket.assignedTo.email}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <Link
                      to={`/tickets/${ticket._id}`}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      onClick={() => setTicketToDelete(ticket)}
                      title="Delete ticket"
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* USERS TAB */
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl text-center text-slate-400 text-sm">
              No users found matching query.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredUsers.map((user) => {
                const isEditing = editingUser === user.email;

                return (
                  <div key={user._id} className="glass-card rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-indigo-400">
                          {user.email ? user.email[0].toUpperCase() : "U"}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white">{user.email}</p>
                          <span
                            className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                              user.role === "admin"
                                ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                                : user.role === "moderator"
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                            }`}
                          >
                            {user.role}
                          </span>
                        </div>
                      </div>

                      {!isEditing && (
                        <button
                          onClick={() => handleEditClick(user)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3 pt-2 border-t border-slate-800">
                        <div>
                          <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                            Role
                          </label>
                          <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="user">User</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                            Skills (comma-separated for AI matching)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. React, Node.js, MongoDB, Docker"
                            value={formData.skills}
                            onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={handleUpdate}
                            disabled={updatingUser}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
                          >
                            {updatingUser ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Save Changes</span>
                          </button>
                          <button
                            onClick={() => setEditingUser(null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                        <span className="text-[11px] font-semibold text-slate-400 block">
                          Assigned Skills:
                        </span>
                        {user.skills && user.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {user.skills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded-md border border-slate-800"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600 italic">No skills configured</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
              <h3 className="text-lg font-bold text-white">Delete Ticket as Admin?</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to permanently delete this ticket:
              </p>
              <p className="text-sm font-semibold text-slate-200 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 truncate">
                "{ticketToDelete.title}"
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setTicketToDelete(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTicket}
                disabled={deletingTicketId !== null}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-sm font-semibold text-white shadow-lg shadow-rose-600/30 transition disabled:opacity-50 cursor-pointer"
              >
                {deletingTicketId ? (
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