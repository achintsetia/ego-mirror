import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, UserPlus, Pencil, Trash2, Shield, User, Crown } from "lucide-react";
import { Label } from "@/components/ui/label";

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "moderator" | "user";
  status: "active" | "inactive" | "suspended";
  joinedAt: string;
  lastActive: string;
}

const initialUsers: AppUser[] = [
  { id: "1", name: "Jane Doe", email: "jane@example.com", role: "admin", status: "active", joinedAt: "2025-12-01", lastActive: "2026-04-06" },
  { id: "2", name: "John Smith", email: "john@example.com", role: "user", status: "active", joinedAt: "2026-01-15", lastActive: "2026-04-05" },
  { id: "3", name: "Alice Chen", email: "alice@example.com", role: "moderator", status: "active", joinedAt: "2026-02-10", lastActive: "2026-04-04" },
  { id: "4", name: "Bob Williams", email: "bob@example.com", role: "user", status: "inactive", joinedAt: "2026-01-20", lastActive: "2026-03-15" },
  { id: "5", name: "Sara Kim", email: "sara@example.com", role: "user", status: "suspended", joinedAt: "2026-03-01", lastActive: "2026-03-28" },
  { id: "6", name: "Mike Johnson", email: "mike@example.com", role: "user", status: "active", joinedAt: "2026-03-10", lastActive: "2026-04-06" },
];

const roleIcon = (role: string) => {
  if (role === "admin") return <Crown className="h-3 w-3" />;
  if (role === "moderator") return <Shield className="h-3 w-3" />;
  return <User className="h-3 w-3" />;
};

const roleBadgeVariant = (role: string) => {
  if (role === "admin") return "default";
  if (role === "moderator") return "secondary";
  return "outline";
};

const statusColor = (status: string) => {
  if (status === "active") return "bg-mint/20 text-mint-dark";
  if (status === "inactive") return "bg-muted text-muted-foreground";
  return "bg-peach/20 text-peach-dark";
};

export default function AdminUsers() {
  const [users, setUsers] = useState<AppUser[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", role: "user" as AppUser["role"], status: "active" as AppUser["status"] });

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditUser(null);
    setFormData({ name: "", email: "", role: "user", status: "active" });
    setDialogOpen(true);
  };

  const openEdit = (u: AppUser) => {
    setEditUser(u);
    setFormData({ name: u.name, email: u.email, role: u.role, status: u.status });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.email) return;
    if (editUser) {
      setUsers((prev) => prev.map((u) => (u.id === editUser.id ? { ...u, ...formData } : u)));
    } else {
      setUsers((prev) => [
        ...prev,
        { ...formData, id: String(Date.now()), joinedAt: new Date().toISOString().slice(0, 10), lastActive: new Date().toISOString().slice(0, 10) },
      ]);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">Manage users, roles, and access permissions</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg">All Users ({users.length})</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openAdd} size="sm">
                    <UserPlus className="h-4 w-4 mr-1" /> Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editUser ? "Edit User" : "Add User"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={formData.name} onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={formData.email} onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={formData.role} onValueChange={(v) => setFormData((f) => ({ ...f, role: v as AppUser["role"] }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={formData.status} onValueChange={(v) => setFormData((f) => ({ ...f, status: v as AppUser["status"] }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleSave} className="w-full">
                      {editUser ? "Save Changes" : "Add User"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant(u.role) as any} className="gap-1 capitalize">
                      {roleIcon(u.role)} {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColor(u.status)}`}>
                      {u.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.joinedAt}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.lastActive}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
