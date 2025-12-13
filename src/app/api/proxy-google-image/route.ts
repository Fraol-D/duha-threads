import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url || !url.startsWith("https://lh3.googleusercontent.com/")) {
    return new Response(JSON.stringify({ error: "Invalid or missing url" }), { status: 400 });
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch image" }), { status: response.status });
    }
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();
    return new Response(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Proxy error" }), { status: 500 });
  }
}
