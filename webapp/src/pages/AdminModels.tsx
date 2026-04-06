import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Brain, Eye, EyeOff, Copy, Check } from "lucide-react";

interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  apiKey: string;
  enabled: boolean;
  params: Record<string, string>;
}

const initialModels: ModelConfig[] = [
  {
    id: "1",
    name: "GPT-5",
    provider: "OpenAI",
    modelId: "gpt-5",
    apiKey: "sk-proj-xxxx...xxxx",
    enabled: true,
    params: { temperature: "0.7", max_tokens: "2048", top_p: "1.0" },
  },
  {
    id: "2",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    modelId: "gemini-2.5-pro",
    apiKey: "AIza...xxxx",
    enabled: true,
    params: { temperature: "0.8", max_tokens: "4096", top_k: "40" },
  },
  {
    id: "3",
    name: "Claude 4 Sonnet",
    provider: "Anthropic",
    modelId: "claude-4-sonnet",
    apiKey: "sk-ant-xxxx...xxxx",
    enabled: false,
    params: { temperature: "0.5", max_tokens: "1024" },
  },
];

const emptyForm = (): Omit<ModelConfig, "id"> => ({
  name: "",
  provider: "",
  modelId: "",
  apiKey: "",
  enabled: true,
  params: {},
});

export default function AdminModels() {
  const [models, setModels] = useState<ModelConfig[]>(initialModels);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ModelConfig, "id">>(emptyForm());
  const [newParamKey, setNewParamKey] = useState("");
  const [newParamValue, setNewParamValue] = useState("");
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (m: ModelConfig) => {
    setEditId(m.id);
    setForm({ name: m.name, provider: m.provider, modelId: m.modelId, apiKey: m.apiKey, enabled: m.enabled, params: { ...m.params } });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.provider || !form.modelId) return;
    if (editId) {
      setModels((prev) => prev.map((m) => (m.id === editId ? { ...m, ...form } : m)));
    } else {
      setModels((prev) => [...prev, { ...form, id: String(Date.now()) }]);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setModels((prev) => prev.filter((m) => m.id !== id));
  };

  const toggleEnabled = (id: string) => {
    setModels((prev) => prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)));
  };

  const addParam = () => {
    if (!newParamKey.trim()) return;
    setForm((f) => ({ ...f, params: { ...f.params, [newParamKey.trim()]: newParamValue } }));
    setNewParamKey("");
    setNewParamValue("");
  };

  const removeParam = (key: string) => {
    setForm((f) => {
      const { [key]: _, ...rest } = f.params;
      return { ...f, params: rest };
    });
  };

  const toggleReveal = (id: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyKey = (id: string, key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">AI Model Configuration</h1>
        <p className="text-muted-foreground mt-1">Manage AI models, API keys, and parameters</p>
      </div>

      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Model
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Model" : "Add Model"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="GPT-5" />
                </div>
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Input value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} placeholder="OpenAI" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Model ID</Label>
                <Input value={form.modelId} onChange={(e) => setForm((f) => ({ ...f, modelId: e.target.value }))} placeholder="gpt-5" />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input type="password" value={form.apiKey} onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))} placeholder="sk-..." />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Parameters (Key / Value)</Label>
                {Object.entries(form.params).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Input value={key} disabled className="flex-1 bg-muted" />
                    <Input
                      value={val}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, params: { ...f.params, [key]: e.target.value } }))
                      }
                      className="flex-1"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeParam(key)} className="text-destructive shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input placeholder="key" value={newParamKey} onChange={(e) => setNewParamKey(e.target.value)} className="flex-1" />
                  <Input placeholder="value" value={newParamValue} onChange={(e) => setNewParamValue(e.target.value)} className="flex-1" />
                  <Button variant="outline" size="icon" onClick={addParam} className="shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button onClick={handleSave} className="w-full">
                {editId ? "Save Changes" : "Add Model"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {models.map((m) => (
          <Card key={m.id} className={`transition-opacity ${!m.enabled ? "opacity-60" : ""}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{m.name}</CardTitle>
                </div>
                <Switch checked={m.enabled} onCheckedChange={() => toggleEnabled(m.id)} />
              </div>
              <CardDescription>{m.provider} · <code className="text-xs bg-muted px-1 py-0.5 rounded">{m.modelId}</code></CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">API Key</Label>
                <div className="flex items-center gap-1">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                    {revealedKeys.has(m.id) ? m.apiKey : "••••••••••••"}
                  </code>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleReveal(m.id)}>
                    {revealedKeys.has(m.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyKey(m.id, m.apiKey)}>
                    {copiedId === m.id ? <Check className="h-3 w-3 text-mint-dark" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              {Object.keys(m.params).length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Parameters</Label>
                  <div className="space-y-1">
                    {Object.entries(m.params).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-mono font-medium text-foreground">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-1 pt-1">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(m)}>
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(m.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
