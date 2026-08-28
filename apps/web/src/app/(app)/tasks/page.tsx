"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { KanbanBoard, KanbanCard, KanbanColumn } from "@/components/kanban";
import { api } from "@/lib/api";
import { TaskStatus, type TaskDto } from "@reos/shared";

const COLUMNS: { key: TaskStatus; title: string }[] = [
  { key: TaskStatus.BACKLOG, title: "Backlog" },
  { key: TaskStatus.IN_PROGRESS, title: "In Progress" },
  { key: TaskStatus.DONE, title: "Done" },
];

const PRIORITY_VARIANT = {
  LOW: "secondary",
  MEDIUM: "default",
  HIGH: "warning",
  URGENT: "destructive",
} as const;

function TaskCardBody({ task }: { task: TaskDto }) {
  return (
    <Card className="cursor-grab p-3 active:cursor-grabbing">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{task.title}</p>
        <Badge variant={PRIORITY_VARIANT[task.priority]}>
          {task.priority.toLowerCase()}
        </Badge>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{task.type.replace(/_/g, " ").toLowerCase()}</span>
        <span>{task.assigneeName ?? "Unassigned"}</span>
      </div>
    </Card>
  );
}

export default function TasksPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get<Record<TaskStatus, TaskDto[]>>("/tasks"),
  });

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      api.patch(`/tasks/${id}`, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const prev = qc.getQueryData<Record<TaskStatus, TaskDto[]>>(["tasks"]);
      if (prev) {
        const next: Record<string, TaskDto[]> = {};
        let moved: TaskDto | undefined;
        for (const col of Object.keys(prev)) {
          next[col] = prev[col as TaskStatus].filter((t) => {
            if (t.id === id) {
              moved = t;
              return false;
            }
            return true;
          });
        }
        if (moved)
          next[status] = [{ ...moved, status }, ...(next[status] ?? [])];
        qc.setQueryData(["tasks"], next);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(["tasks"], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const findTask = (id: string) =>
    Object.values(data ?? {})
      .flat()
      .find((t) => t.id === id);

  return (
    <div>
      <PageHeader
        titleKey="page.tasks.title"
        descriptionKey="page.tasks.subtitle"
      />
      <KanbanBoard
        onMove={(id, to) => move.mutate({ id, status: to as TaskStatus })}
        renderOverlay={(id) => {
          const t = findTask(id);
          return t ? <TaskCardBody task={t} /> : null;
        }}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.key}>
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold">{col.title}</h3>
                <span className="text-xs text-muted-foreground">
                  {data?.[col.key]?.length ?? 0}
                </span>
              </div>
              <KanbanColumn id={col.key} className="min-h-24 space-y-2">
                {data?.[col.key]?.map((task) => (
                  <KanbanCard key={task.id} id={task.id} column={col.key}>
                    <TaskCardBody task={task} />
                  </KanbanCard>
                ))}
                {(!data?.[col.key] || data[col.key].length === 0) && (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No tasks
                  </p>
                )}
              </KanbanColumn>
            </div>
          ))}
        </div>
      </KanbanBoard>
    </div>
  );
}
