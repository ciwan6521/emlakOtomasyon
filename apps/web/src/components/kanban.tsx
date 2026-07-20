"use client";

import { type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface KanbanBoardProps {
  onMove: (cardId: string, toColumn: string) => void;
  children: ReactNode;
  renderOverlay?: (cardId: string) => ReactNode;
}

export function KanbanBoard({
  onMove,
  children,
  renderOverlay,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function handleEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const from = active.data.current?.column as string | undefined;
    const to = over.id as string;
    if (from !== to) onMove(String(active.id), to);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleStart}
      onDragEnd={handleEnd}
    >
      {children}
      <DragOverlay>
        {activeId && renderOverlay ? renderOverlay(activeId) : null}
      </DragOverlay>
    </DndContext>
  );
}

export function KanbanColumn({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl bg-muted/30 p-2 transition-colors",
        isOver && "bg-primary/10 ring-2 ring-primary/40",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function KanbanCard({
  id,
  column,
  children,
}: {
  id: string;
  column: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: { column },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn("touch-none", isDragging && "opacity-40")}
    >
      {children}
    </div>
  );
}
