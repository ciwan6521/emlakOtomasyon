"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { KanbanBoard, KanbanCard, KanbanColumn } from "@/components/kanban";
import { api } from "@/lib/api";
import { useEnumLabel, useT } from "@/lib/i18n/locale-context";
import { TaskStatus, type TaskDto } from "@reos/shared";

// Column headings are the localised status labels (`e("status", key)`).
const COLUMNS: TaskStatus[] = [
  TaskStatus.BACKLOG,
  TaskStatus.IN_PROGRESS,
  TaskStatus.DONE,
];

const PRIORITY_VARIANT = {
  LOW: "secondary",
  MEDIUM: "default",
  HIGH: "warning",
  URGENT: "destructive",
} as const;

function TaskCardBody({ task }: { task: TaskDto }) {
  const t = useT();
  const e = useEnumLabel();
  return (
    <Card className="cursor-grab p-3 active:cursor-grabbing">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{task.title}</p>
        <Badge variant={PRIORITY_VARIANT[task.priority]}>
          {e("taskPriority", task.priority)}
        </Badge>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{e("taskType", task.type)}</span>
        <span>{task.assigneeName ?? t("tasks.unassigned")}</span>
      </div>
    </Card>
  );
}

export default function TasksPage() {
  const t = useT();
  const e = useEnumLabel();
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
          next[col] = prev[col as TaskStatus].filter((task) => {
            if (task.id === id) {
              moved = task;
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
      .find((task) => task.id === id);

  return (
    <div>
      <PageHeader
        titleKey="page.tasks.title"
        descriptionKey="page.tasks.subtitle"
      />
      <KanbanBoard
        onMove={(id, to) => move.mutate({ id, status: to as TaskStatus })}
        renderOverlay={(id) => {
          const task = findTask(id);
          return task ? <TaskCardBody task={task} /> : null;
        }}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col}>
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold">{e("status", col)}</h3>
                <span className="text-xs text-muted-foreground">
                  {data?.[col]?.length ?? 0}
                </span>
              </div>
              <KanbanColumn id={col} className="min-h-24 space-y-2">
                {data?.[col]?.map((task) => (
                  <KanbanCard key={task.id} id={task.id} column={col}>
                    <TaskCardBody task={task} />
                  </KanbanCard>
                ))}
                {(!data?.[col] || data[col].length === 0) && (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    {t("tasks.empty")}
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
