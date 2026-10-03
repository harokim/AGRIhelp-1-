import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useAppointments } from "../context/AppointmentContext";
import { initials } from "../utils";

export default function UserManagement() {
  const { users, user, deleteUser } = useAuth();
  const { appointments } = useAppointments();
  const [q, setQ] = useState("");
  if (user?.role !== "engineer") return <div className="container page-container"><div className="empty-state">Unauthorized</div></div>;
  const list = users.filter((item) => item.status !== "inactive").filter((item) => `${item.name} ${item.email} ${item.association || ""} ${item.barangay || ""}`.toLowerCase().includes(q.toLowerCase()));
  const remove = async (id) => { if (!confirm("Deactivate this client account?")) return; try { await deleteUser(id); } catch (error) { alert(error?.message || "Could not deactivate account."); } };
  return <div className="container page-container"><div className="page-header"><span className="eyebrow">ADMINISTRATION</span><h1>User management</h1><p>Search registered users and deactivate client accounts.</p></div><input className="search-input wide-search" placeholder="Search name, email, association, or barangay..." value={q} onChange={(e) => setQ(e.target.value)} /><div className="table-card card"><table><thead><tr><th>User</th><th>Role</th><th>Contact</th><th>Association</th><th>Appointments</th><th>Action</th></tr></thead><tbody>{list.map((item) => <tr key={item.id}><td><div className="table-user"><div className="avatar">{item.avatar ? <img src={item.avatar} alt="" /> : initials(item.name || item.email)}</div><span><strong>{item.name }</strong><small>{item.email}</small></span></div></td><td><span className="tag">{item.role}</span></td><td>{item.contactNumber || "—"}</td><td>{item.association || "Municipal Office"}</td><td>{appointments.filter((appointment) => appointment.clientId === item.id).length}</td><td>{item.role === "client" ? <button className="danger-btn small" onClick={() => remove(item.id)}>Delete</button> : <span className="muted">Protected</span>}</td></tr>)}</tbody></table></div></div>;
}
