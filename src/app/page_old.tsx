import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MascotSlot } from "@/components/ui/MascotSlot";

export default function Home() {
  return (
    <>
      <Section>
        <Card className="p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Minimalist Tees, Maximum Impact</h1>
              <p className="text-muted">High-contrast, modern designs printed on premium cotton.</p>
              <div className="flex gap-3 pt-2">
                <Link href="/products"><Button>Browse Products</Button></Link>
                <Link href="/custom"><Button variant="secondary">Custom Orders</Button></Link>
              </div>
            </div>
            <MascotSlot variant="hero" />
          </div>
        </Card>
      </Section>

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Browse Products</h2>
            <p className="text-muted mb-4">Explore our catalog of best-selling designs.</p>
            <Link href="/products" className="underline">View Products</Link>
          </Card>
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Custom Orders</h2>
            <p className="text-muted mb-4">Bring your idea, we’ll craft the rest.</p>
            <Link href="/custom" className="underline">Start Custom Order</Link>
          </Card>
        </div>
      </Section>
    </>
  );
}
