import { redirect } from "next/navigation";

// Legacy route: /custom-orders
// This page now permanently redirects to the new builder at /custom-order.
// Keeping a component here avoids 404s for old links & preserves backward compatibility.
export const metadata = {
  title: "Custom Order Builder",
  description: "Redirecting to the updated custom order builder"
};

export default function LegacyCustomOrdersRedirect() {
  redirect("/custom-order");
}
