"use client";

import { useState, useEffect, useCallback } from "react";

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: "",
    name: "",
    password: "",
    role: "USER",
  });
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    if (data.users) setUsers(data.users);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const method = editId ? "PUT" : "POST";
    const body = editId
      ? { id: editId, ...form, password: form.password || undefined }
      : form;

    const res = await fetch("/api/admin/users", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed");
      return;
    }

    setShowForm(false);
    setEditId(null);
    setForm({ username: "", name: "", password: "", role: "USER" });
    loadUsers();
  };

  const handleEdit = (user: User) => {
    setEditId(user.id);
    setForm({
      username: user.username,
      name: user.name,
      password: "",
      role: user.role,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this user?")) return;
    await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadUsers();
  };

  return (
    <div className="max-w-4xl mx-auto pt-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black text-white">User Management</h1>
        <button
          onClick={() => {
            setEditId(null);
            setForm({ username: "", name: "", password: "", role: "USER" });
            setShowForm(true);
          }}
          className="px-6 py-2 bg-accent text-white font-bold rounded hover:bg-accent-light transition"
        >
          Add User
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-lg p-6 mb-6 space-y-4"
        >
          <h2 className="text-xl font-bold text-white">
            {editId ? "Edit User" : "New User"}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="px-3 py-2 rounded bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <input
              type="text"
              placeholder="Display Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 rounded bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <input
              type="password"
              placeholder={editId ? "New password (leave empty to keep)" : "Password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="px-3 py-2 rounded bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent"
              {...(!editId ? { required: true } : {})}
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="px-3 py-2 rounded bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          {error && <p className="text-red-300 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              className="px-6 py-2 bg-accent text-white font-bold rounded hover:bg-accent-light transition"
            >
              {editId ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 py-2 border border-white text-white font-bold rounded hover:bg-white/10 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-sm">
              <th className="py-3 px-4 text-left font-bold">Username</th>
              <th className="py-3 px-4 text-left font-bold">Name</th>
              <th className="py-3 px-4 text-left font-bold">Role</th>
              <th className="py-3 px-4 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-gray-200">
                <td className="py-3 px-4 text-gray-800">{user.username}</td>
                <td className="py-3 px-4 text-gray-800">{user.name}</td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      user.role === "ADMIN"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => handleEdit(user)}
                    className="text-blue-600 hover:text-blue-800 text-sm mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
