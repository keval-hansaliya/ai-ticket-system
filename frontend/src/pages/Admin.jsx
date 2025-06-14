import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ role: "", skills: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [tickets, setTickets] = useState([]);
  const [activeTab, setActiveTab] = useState("tickets"); // "tickets" or "users"

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    } else {
      fetchTickets();
    }
  }, [activeTab]);

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/ticket`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setTickets(data.tickets || []);
      } else {
        console.error(data.error);
      }
    } catch (err) {
      console.error("Error fetching tickets", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
        setFilteredUsers(data);
      } else {
        console.error(data.error);
      }
    } catch (err) {
      console.error("Error fetching users", err);
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user.email);
    setFormData({
      role: user.role,
      skills: user.skills?.join(", "),
    });
  };

  const handleUpdate = async () => {
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
        console.error(data.error || "Failed to update user");
        return;
      }

      setEditingUser(null);
      setFormData({ role: "", skills: "" });
      fetchUsers();
    } catch (err) {
      console.error("Update failed", err);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    setFilteredUsers(
      users.filter((user) => user.email.toLowerCase().includes(query))
    );
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-4">
      <div className="tabs tabs-boxed mb-6">
        <button
          className={`tab ${activeTab === "tickets" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("tickets")}
        >
          All Tickets
        </button>
        <button
          className={`tab ${activeTab === "users" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          Manage Users
        </button>
      </div>

      {activeTab === "tickets" ? (
        <div>
          <h1 className="text-2xl font-bold mb-6">All Tickets</h1>
          <div className="space-y-4">
            {tickets.length === 0 && <p>No tickets found.</p>}
            {tickets.map((ticket) => (
              <Link
                key={ticket._id}
                className="card bg-base-200 shadow-lg hover:shadow-xl transition-shadow p-4 border border-base-300"
                to={`/tickets/${ticket._id}`}
              >
                <h3 className="font-bold text-lg text-base-content">{ticket.title}</h3>
                <p className="text-sm text-base-content/80 mt-2">{ticket.description}</p>
                <div className="mt-3 text-sm text-base-content/70 space-y-1">
                  <p>Status: <span className="font-medium">{ticket.status || "Open"}</span></p>
                  <p>Created: {new Date(ticket.createdAt).toLocaleString()}</p>
                  {ticket.assignedTo && (
                    <p>Assigned to: <span className="font-medium">{ticket.assignedTo.email}</span></p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <h1 className="text-2xl font-bold mb-6">Manage Users</h1>
          <input
            type="text"
            className="input input-bordered w-full mb-6"
            placeholder="Search by email"
            value={searchQuery}
            onChange={handleSearch}
          />
          {filteredUsers.map((user) => (
            <div
              key={user._id}
              className="bg-base-100 shadow rounded p-4 mb-4 border"
            >
              <p>
                <strong>Email:</strong> {user.email}
              </p>
              <p>
                <strong>Current Role:</strong> {user.role}
              </p>
              <p>
                <strong>Skills:</strong>{" "}
                {user.skills && user.skills.length > 0
                  ? user.skills.join(", ")
                  : "N/A"}
              </p>

              {editingUser === user.email ? (
                <div className="mt-4 space-y-2">
                  <select
                    className="select select-bordered w-full"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                  >
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Comma-separated skills"
                    className="input input-bordered w-full"
                    value={formData.skills}
                    onChange={(e) =>
                      setFormData({ ...formData, skills: e.target.value })
                    }
                  />

                  <div className="flex gap-2">
                    <button
                      className="btn btn-success btn-sm"
                      onClick={handleUpdate}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEditingUser(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="btn btn-primary btn-sm mt-2"
                  onClick={() => handleEditClick(user)}
                >
                  Edit
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}