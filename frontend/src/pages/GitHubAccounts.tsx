import { useEffect, useState } from "react";
import { GitBranch, Plus, Trash2, ExternalLink, Eye, EyeOff } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Repo {
  id: number;
  name: string;
  url: string | null;
  provider: string;
  has_token: boolean;
  created_at: string;
}

export default function GitHubAccounts() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);

  const [revealed, setRevealed] = useState<Record<number, string>>({});
  const [revOpen, setRevOpen] = useState(false);
  const [revId, setRevId] = useState<number | null>(null);
  const [revPass, setRevPass] = useState("");
  const [revError, setRevError] = useState("");

  const load = () => api.get("/repos").then((r) => setRepos(r.data));
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/repos", {
        name,
        url: url || null,
        provider: "github",
        token: token || null,
        passphrase: passphrase || null,
      });
      setName(""); setUrl(""); setToken(""); setPassphrase("");
      setOpen(false);
      load();
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Remove this repository?")) return;
    await api.delete(`/repos/${id}`);
    load();
  };

  const reveal = async (e: React.FormEvent) => {
    e.preventDefault();
    setRevError("");
    try {
      const r = await api.post(`/repos/${revId}/reveal`, { passphrase: revPass });
      setRevealed((prev) => ({ ...prev, [revId!]: r.data.token }));
      setRevPass("");
      setRevOpen(false);
    } catch {
      setRevError("Wrong passphrase.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">GitHub Accounts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track your repositories and access tokens</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Repo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Repository</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label>Repository name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-org/my-repo" required />
              </div>
              <div className="space-y-1">
                <Label>URL <span className="text-muted-foreground">(optional)</span></Label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/..." />
              </div>
              <div className="space-y-1">
                <Label>Access token <span className="text-muted-foreground">(optional, stored encrypted)</span></Label>
                <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ghp_..." />
              </div>
              {token && (
                <div className="space-y-1">
                  <Label>Passphrase <span className="text-muted-foreground">(required to encrypt token)</span></Label>
                  <Input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} required={!!token} />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving…" : "Add Repository"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {repos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No repositories yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {repos.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <GitBranch className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <CardTitle className="text-sm font-mono truncate">{r.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {r.has_token && (
                      <button
                        onClick={() => { setRevId(r.id); setRevOpen(true); }}
                        className="text-muted-foreground hover:text-foreground p-1"
                      >
                        {revealed[r.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                    <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant="secondary" className="text-xs">{r.provider}</Badge>
                {r.url && (
                  <a href={r.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary truncate">
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{r.url}</span>
                  </a>
                )}
                {revealed[r.id] && (
                  <p className="font-mono text-xs bg-muted px-2 py-1 rounded break-all">{revealed[r.id]}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Added {new Date(r.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={revOpen} onOpenChange={setRevOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enter Passphrase</DialogTitle></DialogHeader>
          <form onSubmit={reveal} className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label>Passphrase</Label>
              <Input type="password" value={revPass} onChange={(e) => setRevPass(e.target.value)} required autoFocus />
            </div>
            {revError && <p className="text-sm text-destructive">{revError}</p>}
            <Button type="submit" className="w-full">Reveal</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
