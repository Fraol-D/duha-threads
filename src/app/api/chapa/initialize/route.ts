import { NextRequest } from "next/server";
import { env } from "@/config/env";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, email, first_name, last_name, phone_number, tx_ref, callback_url, return_url, customization } = body;
    if (!amount || !email || !first_name || !last_name || !tx_ref) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }
    const chapaRes = await fetch("https://api.chapa.co/v1/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.CHAPA_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "ETB",
        email,
        first_name,
        last_name,
        phone_number,
        tx_ref,
        callback_url,
        return_url,
        customization,
      }),
    });
    const data = await chapaRes.json();
    if (!chapaRes.ok || !data.data?.checkout_url) {
      return new Response(JSON.stringify({ error: data.message || "Failed to initialize payment" }), { status: 400 });
    }
    return new Response(JSON.stringify({ checkout_url: data.data.checkout_url }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
