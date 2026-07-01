import { useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderOpen,
  KeyRound,
  GitBranch,
  Server,
  Settings,
  LogOut,
  Shield,
} from "lucide-react";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderOpen },
  { to: "/secrets", label: "Secrets", icon: KeyRound },
  { to: "/github", label: "GitHub", icon: GitBranch },
  { to: "/hosting", label: "Hosting", icon: Server },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout() {
  const { user, token, fetchMe, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    if (!user) fetchMe();
  }, [token]);

  useEffect(() => {
    if (user && !user.totp_enabled && !user.email_otp_enabled) {
      navigate("/setup-2fa");
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-56 flex flex-col border-r bg-card">
        <div className="flex items-center gap-2 px-4 py-5 border-b">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">PKMS</span>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-2 py-3 border-t">
          <div className="px-3 py-1 text-xs text-muted-foreground truncate">{user?.email}</div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full transition-colors mt-1"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
