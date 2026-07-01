import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus, Eye, EyeOff, Trash2, KeyRound, StickyNote } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Project {
  id: number;
  name: string;
  description: string | null;
}

interface Secret {
  id: number;
  name: string;
  created_at: string;
}

interface KeyValue {
  id: number;
  key: string;
  value: string | null;
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [kvs, setKvs] = useState<KeyValue[]>([]);
  const [revealed, setRevealed] = useState<Record<number, string>>({});

  const [secretOpen, setSecretOpen] = useState(false);
  const [kvOpen, setKvOpen] = useState(false);

  const [sName, setSName] = useState("");
  const [sValue, setSValue] = useState("");
  const [sPass, setSPass] = useState("");
  const [revPass, setRevPass] = useState("");
  const [revId, setRevId] = useState<number | null>(null);
  const [revOpen, setRevOpen] = useState(false);

  const [kvKey, setKvKey] = useState("");
  const [kvValue, setKvValue] = useState("");

  const loadAll = () => {
    api.get(`/projects/${id}`).then((r) => setProject(r.data));
    api.get(`/projects/${id}/secrets`).then((r) => setSecrets(r.data));
    api.get(`/projects/${id}/keyvalues`).then((r) => setKvs(r.data));
  };

  useEffect(() => { loadAll(); }, [id]);

  const createSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post(`/projects/${id}/secrets`, { name: sName, value: sValue, passphrase: sPass });
    setSName(""); setSValue(""); setSPass("");
    setSecretOpen(false);
    loadAll();
  };

  const revealSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api.post(`/projects/${id}/secrets/${revId}/reveal`, { passphrase: revPass });
    setRevealed((prev) => ({ ...prev, [revId!]: r.data.value }));
    setRevPass("");
    setRevOpen(false);
  };

  const deleteSecret = async (sid: number) => {
    if (!confirm("Delete this secret?")) return;
    await api.delete(`/projects/${id}/secrets/${sid}`);
    loadAll();
  };

  const createKv = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post(`/projects/${id}/keyvalues`, { key: kvKey, value: kvValue });
    setKvKey(""); setKvValue("");
    setKvOpen(false);
    loadAll();
  };

  const deleteKv = async (kid: number) => {
    if (!confirm("Delete this key?")) return;
    await api.delete(`/projects/${id}/keyvalues/${kid}`);
    loadAll();
  };

  if (!project) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/projects" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
        </div>
      </div>

      {/* Secrets */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Secrets
            </CardTitle>
            <Dialog open={secretOpen} onOpenChange={setSecretOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" /> Add</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Secret</DialogTitle></DialogHeader>
                <form onSubmit={createSecret} className="space-y-3 mt-2">
                  <div className="space-y-1"><Label>Name</Label><Input value={sName} onChange={(e) => setSName(e.target.value)} required /></div>
                  <div className="space-y-1"><Label>Value</Label><Input type="password" value={sValue} onChange={(e) => setSValue(e.target.value)} required /></div>
                  <div className="space-y-1"><Label>Your passphrase</Label><Input type="password" value={sPass} onChange={(e) => setSPass(e.target.value)} required /></div>
                  <Button type="submit" className="w-full">Save Secret</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {secrets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No secrets yet.</p>
          ) : (
            <div className="space-y-2">
              {secrets.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="font-mono text-sm">{s.name}</span>
                    {revealed[s.id] && (
                      <span className="ml-3 font-mono text-xs bg-muted px-2 py-0.5 rounded">{revealed[s.id]}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setRevId(s.id); setRevOpen(true); }}
                      className="text-muted-foreground hover:text-foreground p-1"
                    >
                      {revealed[s.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button onClick={() => deleteSecret(s.id)} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reveal dialog */}
      <Dialog open={revOpen} onOpenChange={setRevOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enter Passphrase</DialogTitle></DialogHeader>
          <form onSubmit={revealSecret} className="space-y-3 mt-2">
            <div className="space-y-1"><Label>Passphrase</Label><Input type="password" value={revPass} onChange={(e) => setRevPass(e.target.value)} required autoFocus /></div>
            <Button type="submit" className="w-full">Reveal</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Key-Values */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <StickyNote className="h-4 w-4" /> Key-Value Store
            </CardTitle>
            <Dialog open={kvOpen} onOpenChange={setKvOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" /> Add</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Key-Value</DialogTitle></DialogHeader>
                <form onSubmit={createKv} className="space-y-3 mt-2">
                  <div className="space-y-1"><Label>Key</Label><Input value={kvKey} onChange={(e) => setKvKey(e.target.value)} required /></div>
                  <div className="space-y-1"><Label>Value</Label><Input value={kvValue} onChange={(e) => setKvValue(e.target.value)} /></div>
                  <Button type="submit" className="w-full">Save</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {kvs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No key-values yet.</p>
          ) : (
            <div className="space-y-2">
              {kvs.map((kv) => (
                <div key={kv.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="font-mono text-sm">
                    <span className="text-primary">{kv.key}</span>
                    {kv.value && <span className="text-muted-foreground ml-2">= {kv.value}</span>}
                  </div>
                  <button onClick={() => deleteKv(kv.id)} className="text-muted-foreground hover:text-destructive p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
