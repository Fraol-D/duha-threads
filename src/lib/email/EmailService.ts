export type OrderEmailEvent = "order_placed" | "order_accepted" | "order_out_for_delivery" | "order_delivered" | 'custom_order_created' | 'custom_order_status_changed';

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
}

export interface EmailService {
  send(payload: EmailPayload): Promise<void>;
}

// Console-based fallback implementation. Swap with a provider SDK later.
export class ConsoleEmailService implements EmailService {
  async send(payload: EmailPayload): Promise<void> {
    console.info("[EMAIL]", payload.subject, payload.to, payload.text);
  }
}

export function buildOrderEmail(event: OrderEmailEvent, params: Record<string, string>): EmailPayload {
  const to = params.email || "unknown@example.com";
  switch (event) {
    case "order_placed":
      return {
        to,
        subject: `Order Placed - ${params.order_id}`,
        text: `Thank you ${params.customer_name || "Customer"}! Your order ${params.order_id} has been placed. Total: ${params.total}.`,
      };
    case "order_accepted":
      return {
        to,
        subject: `Order Accepted - ${params.order_id}`,
        text: `Your order ${params.order_id} has been accepted and will be processed shortly.`,
      };
    case "order_out_for_delivery":
      return {
        to,
        subject: `Out for Delivery - ${params.order_id}`,
        text: `Your order ${params.order_id} is out for delivery to: ${params.delivery_address}.`,
      };
    case "order_delivered":
      return {
        to,
        subject: `Delivered - ${params.order_id}`,
        text: `Your order ${params.order_id} has been delivered. We hope you enjoy it!`,
      };
    case 'custom_order_created':
      return {
        to,
        subject: `Custom Order Received - ${params.order_id}`,
        text: `Hi ${params.customer_name || 'Customer'}, your custom order (${params.order_id}) is now pending review. We'll update you soon!`,
      };
    case 'custom_order_status_changed':
      return {
        to,
        subject: `Custom Order Update - ${params.order_id}`,
        text: `Status changed to: ${params.status}. View details in your account.`,
      };
  }
}

// Convenience helpers for custom orders
export async function sendCustomOrderCreated(emailService: EmailService, params: { email: string; order_id: string; customer_name?: string }) {
  await emailService.send(buildOrderEmail('custom_order_created', params));
}

export async function sendCustomOrderStatusChanged(emailService: EmailService, params: { email: string; order_id: string; status: string }) {
  await emailService.send(buildOrderEmail('custom_order_status_changed', params));
}
