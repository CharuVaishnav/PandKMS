import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Eye, EyeOff, FolderOpen } from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Project {
  id: number;
  name: string;
}

interface Secret {
  id: number;
  name: string;
  created_at: string;
}

interface ProjectSecrets {
  project: Project;
  secrets: Secret[];
}

export default function Secrets() {
  const [groups, setGroups] = useState<ProjectSecrets[]>([]);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [revOpen, setRevOpen] = useState(false);
  const [revTarget, setRevTarget] = useState<{ projectId: number; secretId: number } | null>(null);
  const [revPass, setRevPass] = useState("");
  const [revErr, setRevErr] = useState("");

  useEffect(() => {
    api.get("/projects").then(async (r) => {
      const projects: Project[] = r.data;
      const results = await Promise.all(
        projects.map(async (p) => {
          const s = await api.get(`/projects/${p.id}/secrets`);
          return { project: p, secrets: s.data };
        })
      );
      setGroups(results.filter((g) => g.secrets.length > 0));
    });
  }, []);

  const openReveal = (projectId: number, secretId: number) => {
    setRevTarget({ projectId, secretId });
    setRevPass("");
    setRevErr("");
    setRevOpen(true);
  };

  const doReveal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revTarget) return;
    setRevErr("");
    try {
      const r = await api.post(
        `/projects/${revTarget.projectId}/secrets/${revTarget.secretId}/reveal`,
        { passphrase: revPass }
      );
      const key = `${revTarget.projectId}-${revTarget.secretId}`;
      setRevealed((prev) => ({ ...prev, [key]: r.data.value }));
      setRevOpen(false);
    } catch {
      setRevErr("Wrong passphrase or corrupted data.");
    }
  };

  const hide = (projectId: number, secretId: number) => {
    const key = `${projectId}-${secretId}`;
    setRevealed((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  const totalSecrets = groups.reduce((acc, g) => acc + g.secrets.length, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Secrets</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {totalSecrets} secret{totalSecrets !== 1 ? "s" : ""} across {groups.length} project{groups.length !== 1 ? "s" : ""}
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <KeyRound className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No secrets yet.</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/projects">Go to Projects</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ project, secrets }) => (
            <Card key={project.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <Link to={`/projects/${project.id}`} className="hover:text-primary">
                    {project.name}
                  </Link>
                  <span className="text-xs text-muted-foreground font-normal ml-auto">
                    {secrets.length} secret{secrets.length !== 1 ? "s" : ""}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {secrets.map((s) => {
                    const key = `${project.id}-${s.id}`;
                    const val = revealed[key];
                    return (
                      <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0 gap-3">
                        <span className="font-mono text-sm">{s.name}</span>
                        <div className="flex items-center gap-2 min-w-0">
                          {val && (
                            <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono truncate max-w-xs">
                              {val}
                            </code>
                          )}
                          <button
                            onClick={() => val ? hide(project.id, s.id) : openReveal(project.id, s.id)}
                            className="text-muted-foreground hover:text-foreground shrink-0 p-1"
                          >
                            {val ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={revOpen} onOpenChange={setRevOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enter Passphrase</DialogTitle></DialogHeader>
          <form onSubmit={doReveal} className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label>Passphrase</Label>
              <Input type="password" value={revPass} onChange={(e) => setRevPass(e.target.value)} required autoFocus />
            </div>
            {revErr && <p className="text-sm text-destructive">{revErr}</p>}
            <Button type="submit" className="w-full">Reveal</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
