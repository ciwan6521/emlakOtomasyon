import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DomainEvent, DomainEventPayloadMap } from "@reos/shared";

@Injectable()
export class EventBus {
  constructor(private readonly emitter: EventEmitter2) {}

  publish<E extends DomainEvent>(
    event: E,
    payload: DomainEventPayloadMap[E],
  ): void {
    this.emitter.emit(event, payload);
  }
}
