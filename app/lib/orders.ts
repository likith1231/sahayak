export type FulfillmentType = "DELIVERY" | "PICKUP";

export interface TrackingStep {
  status: string;
  title: string;
  completed: boolean;
  current: boolean;
  at: string | null;
}

export interface TrackingEvent {
  id: string;
  status: string;
  title: string;
  description: string | null;
  location: string | null;
  createdAt: string;
}

export interface OrderData {
  id: string;
  listingId: string;
  quantity: number;
  totalPrice: number;
  deliveryFee: number;
  status: string;
  paymentMethod: string | null;
  paymentLabel: string;
  createdAt: string;
  fulfillmentType: FulfillmentType;
  fulfillmentStatus: string;
  fulfillmentLabel: string;
  trackingNumber: string | null;
  checkoutGroupId: string | null;
  estimatedDeliveryAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  refundStatus: string | null;
  deliverySlot: string | null;
  deliveryDate: string | null;
  delivery: {
    name: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    pincode: string | null;
    instructions: string | null;
  } | null;
  deliveryPartner: { name: string | null; phone: string | null } | null;
  pickupCenter: { name: string; address: string; district: string } | null;
  rating: number | null;
  review: string | null;
  canCancel: boolean;
  canRate: boolean;
  steps: TrackingStep[];
  events?: TrackingEvent[];
  deliveryOtp?: string;
  listing: {
    cropName: string;
    unit: string;
    price: number;
    farmer?: { name: string; phone: string };
  };
  // Farmer view only
  consumer?: { name: string; phone: string } | null;
  nextStatus?: { status: string; title: string; requiresOtp: boolean } | null;
  canReject?: boolean;
}

export interface Address {
  id: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city: string;
  pincode: string;
  isDefault: boolean;
}

export const ACTIVE_STATUSES = ["PLACED", "CONFIRMED", "PACKED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "READY_FOR_PICKUP"];

export function isActive(order: OrderData) {
  return ACTIVE_STATUSES.includes(order.fulfillmentStatus);
}

/** Tailwind classes for the status badge, following the design-system badge pattern. */
export function statusBadgeClass(status: string) {
  switch (status) {
    case "DELIVERED":
      return "bg-success/10 text-success";
    case "CANCELLED":
      return "bg-error/10 text-error";
    case "OUT_FOR_DELIVERY":
    case "READY_FOR_PICKUP":
      return "bg-accent/20 text-[#8B5E34]";
    case "PLACED":
      return "bg-muted/10 text-muted";
    default:
      return "bg-primary/10 text-primary";
  }
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function dayWord(date: Date) {
  const today = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOf(date) - startOf(today)) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
}

/** Headline like "Arriving tomorrow, Morning (8 AM – 12 PM)" — the hero line on tracking views. */
export function etaHeadline(order: OrderData): string {
  const s = order.fulfillmentStatus;
  if (s === "CANCELLED") return `Cancelled ${order.cancelledAt ? "on " + formatDate(order.cancelledAt) : ""}`.trim();
  if (s === "DELIVERED") {
    const verb = order.fulfillmentType === "DELIVERY" ? "Delivered" : "Picked up";
    return order.deliveredAt ? `${verb} on ${formatDate(order.deliveredAt)}` : verb;
  }
  if (s === "READY_FOR_PICKUP") return "Ready for pickup now";
  if (s === "OUT_FOR_DELIVERY") return "Out for delivery — arriving today";
  if (!order.estimatedDeliveryAt) return order.fulfillmentLabel;

  const eta = new Date(order.estimatedDeliveryAt);
  if (order.fulfillmentType === "DELIVERY") {
    const late = eta.getTime() < Date.now();
    if (late) return "Running a little late — arriving soon";
    const slot = order.deliverySlot ? `, ${order.deliverySlot}` : "";
    const when = order.deliveryDate ? dayWord(new Date(order.deliveryDate + "T00:00:00")) : dayWord(eta);
    return `Arriving ${when}${slot}`;
  }
  return eta.getTime() < Date.now() ? "Ready for pickup soon" : `Ready for pickup by ${dayWord(eta)}`;
}

export function progressPercent(order: OrderData) {
  const steps = order.steps || [];
  if (!steps.length) return 0;
  if (order.fulfillmentStatus === "CANCELLED") return 100;
  const idx = steps.findIndex((s) => s.current);
  return Math.round(((idx < 0 ? 0 : idx) / (steps.length - 1)) * 100);
}
