import { getDb } from "@/lib/db/connection";
import { CustomOrderModel } from "@/lib/db/models/CustomOrder";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Stepper } from "@/components/ui/Stepper";
import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";

const STATUS_ORDER = [
  "PENDING_REVIEW",
  "APPROVED",
  "IN_DESIGN",
  "IN_PRINTING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export default async function CustomOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  
  // Verify auth server-side
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  
  if (!token) {
    return (
      <div className="py-24 text-center">
        <Card variant="glass" className="p-8 inline-block">
          <h1 className="text-2xl font-semibold mb-2">Unauthorized</h1>
          <Link href="/login" className="underline">
            Please log in
          </Link>
        </Card>
      </div>
    );
  }

  await getDb();
  const customOrder = await CustomOrderModel.findById(id).lean();

  if (!customOrder) {
    return (
      <div className="py-24 text-center">
        <Card variant="glass" className="p-8 inline-block">
          <h1 className="text-2xl font-semibold mb-2">Order not found</h1>
          <Link href="/custom-orders" className="underline">
            Back to Custom Orders
          </Link>
        </Card>
      </div>
    );
  }

  // Build status steps for Stepper
  const normalizedStatus = customOrder.status === 'ACCEPTED' ? 'APPROVED' : customOrder.status;
  const currentStatusIndex = STATUS_ORDER.indexOf(normalizedStatus);
  const statusSteps: { key: string; label: string; status: 'completed' | 'current' | 'upcoming' }[] = STATUS_ORDER.map((status, index) => ({
    key: status,
    label: status.replace(/_/g, " "),
    status: (index < currentStatusIndex
      ? 'completed'
      : index === currentStatusIndex
      ? 'current'
      : 'upcoming') as 'completed' | 'current' | 'upcoming',
  }));

  return (
    <div className="py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/custom-orders" className="text-sm underline hover:no-underline mb-2 inline-block">
            ← Back to Custom Orders
          </Link>
          <h1 className="text-hero">Custom Order Details</h1>
        </div>
        <Badge className="text-base px-4 py-2">
          {customOrder.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <Card variant="glass" className="p-6">
        <h2 className="text-xl font-semibold mb-4">Order Status</h2>
        <Stepper steps={statusSteps} />
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Base Shirt</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted">Color:</span> {customOrder.baseShirt.color}
            </div>
            <div>
              <span className="text-muted">Size:</span> {customOrder.baseShirt.size}
            </div>
            <div>
              <span className="text-muted">Quantity:</span> {customOrder.baseShirt.quantity}
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Pricing</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Base Price:</span>
              <span>${customOrder.pricing.basePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Placement Cost:</span>
              <span>${customOrder.pricing.placementCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Quantity:</span>
              <span>×{customOrder.pricing.quantityMultiplier}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Estimated Total:</span>
              <span>${customOrder.pricing.estimatedTotal.toFixed(2)}</span>
            </div>
            {customOrder.pricing.finalTotal && (
              <div className="flex justify-between font-bold text-lg">
                <span>Final Total:</span>
                <span>${customOrder.pricing.finalTotal.toFixed(2)}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Placements</h2>
        <div className="flex gap-2 flex-wrap">
          {customOrder.placements.map((p, i) => (
            <span key={i} className="soft-3d px-4 py-2 rounded-full text-sm">
              {p.label}
            </span>
          ))}
        </div>
      </Card>

      {customOrder.designAssets.length > 0 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Design Assets</h2>
          <div className="space-y-4">
            {customOrder.designAssets.map((asset, i) => (
              <div key={i} className="border border-muted rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {customOrder.placements.find((p) => p.placementKey === asset.placementKey)?.label || asset.placementKey}
                  </span>
                  <Badge>{asset.type}</Badge>
                </div>
                {asset.type === "image" && asset.imageUrl && (
                  <Image
                    src={asset.imageUrl}
                    alt={`Design for ${asset.placementKey}`}
                    width={128}
                    height={128}
                    className="w-32 h-32 object-cover rounded"
                  />
                )}
                {asset.type === "text" && (
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="text-muted">Text:</span> &quot;{asset.text}&quot;
                    </div>
                    {asset.font && (
                      <div>
                        <span className="text-muted">Font:</span> {asset.font}
                      </div>
                    )}
                    {asset.color && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted">Color:</span>
                        <span
                          className="inline-block w-6 h-6 rounded border"
                          style={{ backgroundColor: asset.color }}
                        />
                        {asset.color}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {customOrder.notes && (
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Notes</h2>
          <p className="text-sm whitespace-pre-wrap">{customOrder.notes}</p>
        </Card>
      )}

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Delivery Information</h2>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-muted">Email:</span> {customOrder.delivery.email}
          </div>
          <div>
            <span className="text-muted">Phone:</span> {customOrder.delivery.phone}
          </div>
          <div>
            <span className="text-muted">Address:</span>
            <p className="mt-1 whitespace-pre-wrap">{customOrder.delivery.address}</p>
          </div>
        </div>
      </Card>

      <Card variant="soft3D" className="p-4 text-sm text-muted">
        <div className="flex justify-between">
          <span>Order Created:</span>
          <span>{new Date(customOrder.createdAt).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Last Updated:</span>
          <span>{new Date(customOrder.updatedAt).toLocaleString()}</span>
        </div>
      </Card>
    </div>
  );
}
