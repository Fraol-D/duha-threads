export function Footer() {
  return (
    <footer className="py-6 md:px-8 md:py-0 mt-12 text-sm text-gray-600">
      <div className="mx-auto max-w-7xl px-4 py-8 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <p>&copy; {new Date().getFullYear()} Duha Threads. All rights reserved.</p>
        <p className="text-xs">Built with Next.js + Tailwind CSS.</p>
      </div>
    </footer>
  );
}
