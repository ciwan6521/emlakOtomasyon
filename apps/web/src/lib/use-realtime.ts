"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { DomainEvent } from "@reos/shared";
import { getTokens, WS_URL } from "./api";

let socket: Socket | null = null;

export function useRealtime(): void {
  const qc = useQueryClient();

  useEffect(() => {
    const tokens = getTokens();
    if (!tokens?.accessToken) return;

    socket = io(`${WS_URL}/realtime`, {
      auth: { token: tokens.accessToken },
      transports: ["websocket"],
    });

    const invalidate = (keys: string[]) =>
      keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

    socket.on(DomainEvent.LEAD_CREATED, () =>
      invalidate(["leads", "analytics"]),
    );
    socket.on(DomainEvent.LEAD_ASSIGNED, () => invalidate(["leads", "tasks"]));
    socket.on(DomainEvent.LEAD_STATUS_CHANGED, () =>
      invalidate(["leads", "analytics"]),
    );
    socket.on(DomainEvent.CALL_COMPLETED, () =>
      invalidate(["calls", "leads", "analytics"]),
    );
    socket.on(DomainEvent.PROPERTY_CREATED, () => invalidate(["properties"]));
    socket.on(DomainEvent.PROPERTY_PUBLISHED, () =>
      invalidate(["properties", "matching"]),
    );
    socket.on(DomainEvent.MATCH_GENERATED, () => invalidate(["matching"]));
    socket.on(DomainEvent.DEAL_STAGE_CHANGED, () =>
      invalidate(["pipeline", "analytics"]),
    );
    socket.on(DomainEvent.NOTIFICATION_CREATED, () =>
      invalidate(["notifications"]),
    );
    socket.on(DomainEvent.APPOINTMENT_CREATED, () =>
      invalidate(["appointments", "tasks"]),
    );
    socket.on(DomainEvent.COMMISSION_CREATED, () => invalidate(["finance"]));

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [qc]);
}
