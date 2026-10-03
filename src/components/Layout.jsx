import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";

export default function Layout({
  children,
}) {
  const { user } = useAuth();

  const [collapsed, setCollapsed] =
    useState(false);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  if (!user) {
    return children;
  }

  return (
    <div
      className={`app-shell ${
        collapsed
          ? "sidebar-collapsed"
          : "sidebar-expanded"
      }`}
    >
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {mobileOpen && (
        <button
          type="button"
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() =>
            setMobileOpen(false)
          }
        />
      )}

      <main className="app-content">
        <button
          type="button"
          className="mobile-menu-btn"
          aria-label="Open navigation"
          onClick={() =>
            setMobileOpen(true)
          }
        >
          <span />
          <span />
          <span />
        </button>

        {children}
      </main>
    </div>
  );
}