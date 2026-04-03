export type BookingCalendarStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show"
  | "rescheduled";

export function bookingStatusCalendarColors(status: BookingCalendarStatus): {
  bg: string;
  border: string;
  text: string;
} {
  switch (status) {
    case "confirmed":
      return { bg: "#2563eb", border: "#1d4ed8", text: "#ffffff" };
    case "pending":
      return { bg: "#f59e0b", border: "#d97706", text: "#111827" };
    case "completed":
      return { bg: "#16a34a", border: "#15803d", text: "#ffffff" };
    case "rescheduled":
      return { bg: "#7c3aed", border: "#6d28d9", text: "#ffffff" };
    case "no_show":
      return { bg: "#ef4444", border: "#dc2626", text: "#ffffff" };
    case "cancelled":
      return { bg: "#9ca3af", border: "#6b7280", text: "#111827" };
  }
}
