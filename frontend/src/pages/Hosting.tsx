import { useEffect, useState } from "react";
import { Server, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const PROVIDERS = ["vercel", "netlify", "railway", "fly.io", "render", "digitalocean", "aws", "other"];

interface Account {
  id: number;
  name: string;
  provider: string;
  has_token: boolean;
  created_at: string;
}

export default function Hosting() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("vercel");
  const [token, setToken] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);

  const [revealed, setRevealed] = useState<Record<number, string>>({});
  const [revOpen, setRevOpen] = useState(false);
  const [revId, setRevId] = useState<number | null>(null);
  const [revPass, setRevPass] = useState("");
  const [revError, setRevError] = useState("");

  const load = () => api.get("/hosting").then((r) => setAccounts(r.data));
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/hosting", {
        name,
        provider,
        token: token || null,
        passphrase: passphrase || null,
      });
      setName(""); setProvider("vercel"); setToken(""); setPassphrase("");
      setOpen(false);
      load();
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Remove this hosting account?")) return;
    await api.delete(`/hosting/${id}`);
    load();
  };

  const reveal = async (e: React.FormEvent) => {
    e.preventDefault();
    setRevError("");
    try {
      const r = await api.post(`/hosting/${revId}/reveal`, { passphrase: revPass });
      setRevealed((prev) => ({ ...prev, [revId!]: r.data.token }));
      setRevPass("");
      setRevOpen(false);
    } catch {
      setRevError("Wrong passphrase.");
    }
  };

  const providerColors: Record<string, string> = {
    vercel: "bg-black text-white",
    netlify: "bg-teal-600 text-white",
    railway: "bg-purple-600 text-white",
    "fly.io": "bg-blue-600 text-white",
    render: "bg-green-600 text-white",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hosting</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your hosting provider accounts</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Hosting Account</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label>Account name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Vercel account" required />
              </div>
              <div className="space-y-1">
                <Label>Provider</Label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>API token <span className="text-muted-foreground">(optional, stored encrypted)</span></Label>
                <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} />
              </div>
              {token && (
                <div className="space-y-1">
                  <Label>Passphrase <span className="text-muted-foreground">(to encrypt token)</span></Label>
                  <Input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} required={!!token} />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving…" : "Add Account"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Server className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No hosting accounts yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm">{a.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    {a.has_token && (
                      <button
                        onClick={() => { setRevId(a.id); setRevOpen(true); }}
                        className="text-muted-foreground hover:text-foreground p-1"
                      >
                        {revealed[a.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                    <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${providerColors[a.provider] ?? "bg-secondary text-secondary-foreground"}`}>
                  {a.provider}
                </span>
                {revealed[a.id] && (
                  <p className="font-mono text-xs bg-muted px-2 py-1 rounded break-all">{revealed[a.id]}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Added {new Date(a.created_at).toLocaleDateString()}
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
