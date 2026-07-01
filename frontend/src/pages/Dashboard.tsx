import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FolderOpen, KeyRound, Server, GitBranch, Plus } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/store/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Stats {
  projects: number;
  hosting: number;
  repos: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ projects: 0, hosting: 0, repos: 0 });

  useEffect(() => {
    Promise.all([
      api.get("/projects"),
      api.get("/hosting"),
      api.get("/repos"),
    ]).then(([p, h, r]) => {
      setStats({ projects: p.data.length, hosting: h.data.length, repos: r.data.length });
    });
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome back, {user?.email}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FolderOpen className="h-4 w-4" /> Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.projects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Server className="h-4 w-4" /> Hosting Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.hosting}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <GitBranch className="h-4 w-4" /> GitHub Repos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.repos}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start gap-2">
              <Link to="/projects">
                <Plus className="h-4 w-4" /> New Project
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start gap-2">
              <Link to="/hosting">
                <Server className="h-4 w-4" /> Add Hosting Account
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start gap-2">
              <Link to="/github">
                <GitBranch className="h-4 w-4" /> Add GitHub Repo
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Two-factor auth</span>
              <span className={user?.totp_enabled ? "text-green-600" : "text-amber-500"}>
                {user?.totp_enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full mt-2">
              <Link to="/settings">Manage Security</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
