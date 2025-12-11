import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-24 text-center space-y-4">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted">The page you are looking for does not exist.</p>
      <div><Link href="/" className="underline">Back to Home</Link></div>
    </div>
  );
}
