import { DeliveryStatus } from "@reos/shared";
import { advancesDelivery } from "./delivery-status";

describe("advancesDelivery", () => {
  it("accepts a provider receipt that moves the delivery forward", () => {
    expect(advancesDelivery(DeliveryStatus.SENT, DeliveryStatus.DELIVERED)).toBe(
      true,
    );
    expect(
      advancesDelivery(DeliveryStatus.DELIVERED, DeliveryStatus.CLICKED),
    ).toBe(true);
  });

  it("ignores receipts that arrive late or repeat a state", () => {
    expect(advancesDelivery(DeliveryStatus.DELIVERED, DeliveryStatus.SENT)).toBe(
      false,
    );
    expect(advancesDelivery(DeliveryStatus.SENT, DeliveryStatus.SENT)).toBe(
      false,
    );
  });

  it("records a failure reported after the provider accepted the message", () => {
    expect(advancesDelivery(DeliveryStatus.QUEUED, DeliveryStatus.FAILED)).toBe(
      true,
    );
    expect(advancesDelivery(DeliveryStatus.SENT, DeliveryStatus.FAILED)).toBe(
      true,
    );
  });

  it("never fails a delivery that already reached the recipient", () => {
    expect(
      advancesDelivery(DeliveryStatus.DELIVERED, DeliveryStatus.FAILED),
    ).toBe(false);
    expect(advancesDelivery(DeliveryStatus.CLICKED, DeliveryStatus.FAILED)).toBe(
      false,
    );
  });

  it("keeps a failed delivery failed", () => {
    expect(advancesDelivery(DeliveryStatus.FAILED, DeliveryStatus.DELIVERED)).toBe(
      false,
    );
  });
});
