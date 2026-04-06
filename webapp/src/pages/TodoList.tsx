import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListTodo, Circle, CheckCircle2, Clock, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TodoItem {
  id: string;
  text: string;
  status: "open" | "closed";
  createdAt: { toDate?: () => Date } | null;
  closedAt: { toDate?: () => Date } | Date | null;
}

const toDate = (val: TodoItem["closedAt"]): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === "object" && "toDate" in val && typeof val.toDate === "function") return val.toDate();
  return null;
};

const TodoList = () => {
  const { user } = useAuth();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }
    (async () => {
      try {
        const snap = await getDoc(doc(db, "todo", user.email));
        setTodos(snap.exists() ? (snap.data().items ?? []) : []);
      } catch (err) {
        console.error("TodoList: fetch failed", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.email]);

  const handleToggle = async (id: string, currentStatus: string) => {
    if (!user?.email || toggling) return;
    const newStatus = currentStatus === "open" ? "closed" : "open";
    setToggling(id);

    const updated = todos.map((t) =>
      t.id === id
        ? { ...t, status: newStatus as "open" | "closed", closedAt: newStatus === "closed" ? new Date() : null }
        : t,
    );
    setTodos(updated);

    try {
      await updateDoc(doc(db, "todo", user.email), { items: updated });
    } catch (err) {
      console.error("TodoList: toggle failed", err);
      setTodos(todos); // revert
    } finally {
      setToggling(null);
    }
  };

  const openTodos = todos.filter((t) => t.status === "open");
  const closedTodos = todos.filter((t) => t.status === "closed");

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-3 pt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <ListTodo className="h-6 w-6 text-primary" /> To-Do
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Action items extracted from your conversations with Avyaa. Click any item to toggle it.
        </p>
      </div>

      {todos.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <ListTodo className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No to-do items yet. Chat with Avyaa and your action items will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Open todos */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Open
              </CardTitle>
              <CardDescription>
                {openTodos.length === 0 ? "All done!" : `${openTodos.length} item${openTodos.length === 1 ? "" : "s"} remaining`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {openTodos.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">🎉 Nothing left to do!</p>
              ) : (
                <ul className="space-y-1">
                  {openTodos.map((todo) => {
                    const created = toDate(todo.createdAt);
                    return (
                      <li
                        key={todo.id}
                        onClick={() => handleToggle(todo.id, todo.status)}
                        className={cn(
                          "flex items-start gap-3 px-3 py-3 rounded-lg cursor-pointer group transition-colors hover:bg-muted/50",
                          toggling === todo.id && "opacity-50 pointer-events-none",
                        )}
                      >
                        <Circle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground/90 leading-snug">{todo.text}</p>
                          {created && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Added {format(created, "d MMM yyyy")}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Closed todos */}
          {closedTodos.length > 0 && (
            <Card className="border-none shadow-sm opacity-80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-mint" /> Completed
                </CardTitle>
                <CardDescription>{closedTodos.length} item{closedTodos.length === 1 ? "" : "s"} done</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {closedTodos.map((todo) => {
                    const closed = toDate(todo.closedAt);
                    return (
                      <li
                        key={todo.id}
                        onClick={() => handleToggle(todo.id, todo.status)}
                        className={cn(
                          "flex items-start gap-3 px-3 py-3 rounded-lg cursor-pointer group transition-colors hover:bg-muted/50",
                          toggling === todo.id && "opacity-50 pointer-events-none",
                        )}
                      >
                        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-mint" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-muted-foreground line-through leading-snug">{todo.text}</p>
                          {closed && (
                            <p className="text-[11px] text-muted-foreground/70 mt-0.5 flex items-center gap-1">
                              <RotateCcw className="h-2.5 w-2.5" /> Tap to reopen · Done {format(closed, "d MMM yyyy")}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default TodoList;
