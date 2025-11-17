import Image from "next/image";
import Link from "next/link";
import { MascotSlot } from "@/components/ui/MascotSlot";
export default function NotFound() {
  return (
    <div className="py-24 text-center space-y-4">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted">The page you are looking for doesn’t exist.</p>
      <div className="max-w-sm mx-auto"><MascotSlot variant="404" /></div>
      <div><Link href="/" className="underline">Back to Home</Link></div>
    </div>
  );
}
