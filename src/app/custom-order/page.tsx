"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Stepper } from "@/components/ui/Stepper";
import { MascotSlot } from "@/components/ui/MascotSlot";
import { fadeInUp } from "@/lib/motion";
import { DesignAssistant } from "@/components/DesignAssistant";
import { logEvent } from "@/lib/loggerEvents";

interface Product {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  colors?: string[];
  sizes?: string[];
}

interface Placement {
  key: string;
  label: string;
  selected: boolean;
}

interface DesignAsset {
  placementKey: string;
  type: "image" | "text";
  sourceType: "uploaded" | "template" | "ai_generated";
  imageUrl?: string;
  text?: string;
  font?: string;
  color?: string;
}

const AVAILABLE_PLACEMENTS: Placement[] = [
  { key: "front", label: "Front", selected: false },
  { key: "back", label: "Back", selected: false },
  { key: "chest", label: "Chest Pocket", selected: false },
  { key: "sleeve_left", label: "Left Sleeve", selected: false },
  { key: "sleeve_right", label: "Right Sleeve", selected: false },
];

const FONTS = ["Arial", "Helvetica", "Times New Roman", "Georgia", "Courier New", "Verdana"];

export default function CustomOrderBuilderPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Base Shirt
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [color, setColor] = useState<string>("");
  const [size, setSize] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);

  // Step 2: Placements
  const [placements, setPlacements] = useState<Placement[]>(AVAILABLE_PLACEMENTS);

  // Step 3: Design Assets
  const [designAssets, setDesignAssets] = useState<DesignAsset[]>([]);
  const [activeDesignPlacement, setActiveDesignPlacement] = useState<string>("");

  // Step 4: Review & Notes
  const [notes, setNotes] = useState<string>("");

  // Step 5: Delivery
  const [address, setAddress] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  const selectedPlacements = placements.filter((p) => p.selected);
  const selectedProductData = products.find((p) => p.id === selectedProduct);

  useEffect(() => {
    // Fetch base products for shirts
    fetch("/api/products?category=shirts&pageSize=50")
      .then((r) => r.json())
      .then((data) => setProducts(data.products || []))
      .catch(() => setError("Failed to load products"));

    // Pre-fill user email from profile if logged in
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setEmail(data.user.email || "");
        }
      })
      .catch(() => {});
  }, []);

  // Log start event when user selects first product (heuristic) or reaches step 1
  useEffect(() => {
    if (currentStep === 1) {
      logEvent({ type: 'custom_order_started', entityId: null });
    }
  }, [currentStep]);

  const steps = [
    { label: "Base Shirt", status: (currentStep > 0 ? "completed" : currentStep === 0 ? "current" : "upcoming") as "completed" | "current" | "upcoming" },
    { label: "Placements", status: (currentStep > 1 ? "completed" : currentStep === 1 ? "current" : "upcoming") as "completed" | "current" | "upcoming" },
    { label: "Designs", status: (currentStep > 2 ? "completed" : currentStep === 2 ? "current" : "upcoming") as "completed" | "current" | "upcoming" },
    { label: "Review", status: (currentStep > 3 ? "completed" : currentStep === 3 ? "current" : "upcoming") as "completed" | "current" | "upcoming" },
    { label: "Delivery", status: (currentStep > 4 ? "completed" : currentStep === 4 ? "current" : "upcoming") as "completed" | "current" | "upcoming" },
  ];

  function handleNext() {
    if (currentStep === 0) {
      if (!selectedProduct || !color || !size || quantity < 1) {
        setError("Please complete all base shirt fields");
        return;
      }
    } else if (currentStep === 1) {
      if (selectedPlacements.length === 0) {
        setError("Please select at least one placement");
        return;
      }
    } else if (currentStep === 4) {
      if (!address || !phone || !email) {
        setError("Please complete delivery information");
        return;
      }
    }
    
    setError(null);
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  }

  function handleBack() {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        baseShirt: {
          productId: selectedProduct,
          color,
          size,
          quantity,
        },
        placements: selectedPlacements.map((p) => ({ placementKey: p.key, label: p.label })),
        designAssets,
        notes,
        delivery: { address, phone, email },
      };

      const res = await fetch("/api/custom-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create custom order");
      }

      const data = await res.json();
      logEvent({ type: 'custom_order_completed', entityId: data.customOrderId });
      router.push(`/custom-orders/${data.customOrderId}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to submit order";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function togglePlacement(key: string) {
    setPlacements((prev) => prev.map((p) => (p.key === key ? { ...p, selected: !p.selected } : p)));
  }

  async function handleImageUpload(placementKey: string, file: File) {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("placementKey", placementKey);

      const res = await fetch("/api/uploads/custom-design", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      
      setDesignAssets((prev) => [
        ...prev.filter((a) => a.placementKey !== placementKey || a.type !== "image"),
        {
          placementKey,
          type: "image",
          sourceType: "uploaded",
          imageUrl: data.imageUrl,
        },
      ]);
    } catch {
      setError("Failed to upload image");
    } finally {
      setLoading(false);
    }
  }

  function addTextDesign(placementKey: string, text: string, font: string, color: string) {
    setDesignAssets((prev) => [
      ...prev.filter((a) => a.placementKey !== placementKey || a.type !== "text"),
      {
        placementKey,
        type: "text",
        sourceType: "uploaded",
        text,
        font,
        color,
      },
    ]);
  }

  function applyTemplatePlacements(payload: { placements: { placementKey: string; type: string; imageUrl?: string | null; text?: string | null; font?: string | null; color?: string | null }[] }) {
    // Merge placements: auto-select any placement from template
    const templatePlacementKeys = payload.placements.map(p => p.placementKey);
    setPlacements(prev => prev.map(p => templatePlacementKeys.includes(p.key) ? { ...p, selected: true } : p));
    // Merge design assets from template placements
    setDesignAssets(prev => {
      const filtered = prev.filter(a => !templatePlacementKeys.includes(a.placementKey));
      const additions = payload.placements.map(p => {
        if (p.type === 'image' && p.imageUrl) {
          return { placementKey: p.placementKey, type: 'image', sourceType: 'template', imageUrl: p.imageUrl } as DesignAsset;
        }
        if (p.type === 'text' && p.text) {
          return { placementKey: p.placementKey, type: 'text', sourceType: 'template', text: p.text, font: p.font || 'Inter', color: p.color || '#ffffff' } as DesignAsset;
        }
        if (p.type === 'combo') {
          // For combo we could have both image and text; treat image first if exists
          if (p.imageUrl) {
            return { placementKey: p.placementKey, type: 'image', sourceType: 'template', imageUrl: p.imageUrl } as DesignAsset;
          } else if (p.text) {
            return { placementKey: p.placementKey, type: 'text', sourceType: 'template', text: p.text, font: p.font || 'Inter', color: p.color || '#ffffff' } as DesignAsset;
          }
        }
        return null;
      }).filter(Boolean) as DesignAsset[];
      return [...filtered, ...additions];
    });
    // Jump to design step if not there yet
    if (currentStep < 2) setCurrentStep(2);
  }

  const estimatedTotal = selectedProductData
    ? (selectedProductData.basePrice + selectedPlacements.length * 15) * quantity
    : 0;

  return (
    <div className="py-8">
      <motion.div variants={fadeInUp} initial="hidden" animate="show">
        <h1 className="text-hero mb-8">Custom Order Builder</h1>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Builder Area */}
        <div className="lg:col-span-2 space-y-6">
          <Card variant="glass" className="p-6">
            <Stepper steps={steps} />
          </Card>

          <Card className="p-6 space-y-6">
            {currentStep === 0 && (
              <div className="space-y-4">
                <h2 className="text-section-title">Choose Base Shirt</h2>
                <Select value={selectedProduct} onChange={(e) => setSelectedProduct(e.currentTarget.value)}>
                  <option value="">Select a product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - ${p.basePrice}
                    </option>
                  ))}
                </Select>
                
                {selectedProductData && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Color</label>
                      <div className="flex gap-2 flex-wrap">
                        {selectedProductData.colors?.map((c) => (
                          <button
                            key={c}
                            onClick={() => setColor(c)}
                            className={`soft-3d px-4 py-2 rounded-full text-sm ${
                              color === c ? "ring-2 ring-token" : ""
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Size</label>
                      <div className="flex gap-2 flex-wrap">
                        {selectedProductData.sizes?.map((s) => (
                          <button
                            key={s}
                            onClick={() => setSize(s)}
                            className={`soft-3d px-4 py-2 rounded-full text-sm ${
                              size === s ? "ring-2 ring-token" : ""
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Quantity</label>
                      <Input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.currentTarget.value))}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <h2 className="text-section-title">Select Placements</h2>
                <p className="text-sm text-muted">Choose where you want designs on your shirt ($15 per placement)</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {placements.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => togglePlacement(p.key)}
                      className={`soft-3d p-4 rounded-lg text-left transition-all ${
                        p.selected ? "ring-2 ring-token" : ""
                      }`}
                    >
                      <div className="font-medium">{p.label}</div>
                      <div className="text-xs text-muted mt-1">{p.selected ? "Selected" : "Click to select"}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <h2 className="text-section-title">Design Your Shirt</h2>
                {selectedPlacements.length === 0 ? (
                  <p className="text-muted">No placements selected. Go back to select placements.</p>
                ) : (
                  <div className="space-y-6">
                    {selectedPlacements.map((placement) => {
                      const existingDesign = designAssets.find((a) => a.placementKey === placement.key);
                      const isActive = activeDesignPlacement === placement.key;

                      return (
                        <Card key={placement.key} variant="soft3D" className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium">{placement.label}</h3>
                            <button
                              className="text-sm underline hover:no-underline"
                              onClick={() => setActiveDesignPlacement(isActive ? "" : placement.key)}
                            >
                              {isActive ? "Close" : existingDesign ? "Edit" : "Add Design"}
                            </button>
                          </div>

                          {existingDesign && (
                            <div className="text-sm">
                              {existingDesign.type === "image" && existingDesign.imageUrl && (
                                <div className="flex items-center gap-2">
                                  <Image
                                    src={existingDesign.imageUrl}
                                    alt="Design"
                                    width={64}
                                    height={64}
                                    className="w-16 h-16 object-cover rounded"
                                  />
                                  <span className="text-muted">Image uploaded</span>
                                </div>
                              )}
                              {existingDesign.type === "text" && (
                                <div className="text-muted">
                                  Text: &quot;{existingDesign.text}&quot; ({existingDesign.font}, {existingDesign.color})
                                </div>
                              )}
                            </div>
                          )}

                          {isActive && (
                            <div className="space-y-3 pt-3 border-t border-muted">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Upload Image</label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="block w-full text-sm"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageUpload(placement.key, file);
                                  }}
                                />
                              </div>

                              <div className="text-sm text-muted text-center py-2">OR</div>

                              <div className="space-y-3">
                                <label className="text-sm font-medium">Add Text</label>
                                <Input
                                  placeholder="Enter text"
                                  id={`text-${placement.key}`}
                                />
                                <Select id={`font-${placement.key}`} defaultValue="Arial">
                                  {FONTS.map((f) => (
                                    <option key={f} value={f}>
                                      {f}
                                    </option>
                                  ))}
                                </Select>
                                <Input
                                  type="color"
                                  id={`color-${placement.key}`}
                                  defaultValue="#000000"
                                />
                                <Button
                                  variant="secondary"
                                  className="w-full"
                                  onClick={() => {
                                    const textEl = document.getElementById(`text-${placement.key}`) as HTMLInputElement;
                                    const fontEl = document.getElementById(`font-${placement.key}`) as HTMLSelectElement;
                                    const colorEl = document.getElementById(`color-${placement.key}`) as HTMLInputElement;
                                    
                                    if (textEl.value) {
                                      addTextDesign(placement.key, textEl.value, fontEl.value, colorEl.value);
                                      setActiveDesignPlacement("");
                                    }
                                  }}
                                >
                                  Add Text Design
                                </Button>
                              </div>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <h2 className="text-section-title">Review & Notes</h2>
                <Card variant="soft3D" className="p-4 space-y-3">
                  <div>
                    <div className="font-medium">Base Shirt</div>
                    <div className="text-sm text-muted">
                      {selectedProductData?.name} - {color} - {size} - Qty: {quantity}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Placements ({selectedPlacements.length})</div>
                    <div className="text-sm text-muted">
                      {selectedPlacements.map((p) => p.label).join(", ")}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Design Assets ({designAssets.length})</div>
                    <div className="text-sm text-muted">
                      {designAssets.length === 0
                        ? "No designs added"
                        : designAssets.map((a) => `${a.placementKey}: ${a.type}`).join(", ")}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Estimated Total</div>
                    <div className="text-2xl font-bold">${estimatedTotal.toFixed(2)}</div>
                    <div className="text-xs text-muted">
                      Base: ${selectedProductData?.basePrice || 0} + Placements: ${selectedPlacements.length * 15} × {quantity}
                    </div>
                  </div>
                </Card>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Additional Notes (Optional)</label>
                  <Textarea
                    placeholder="Any special requests or instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.currentTarget.value)}
                    rows={4}
                  />
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <h2 className="text-section-title">Delivery Information</h2>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.currentTarget.value)}
                      placeholder="your@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.currentTarget.value)}
                      placeholder="+1234567890"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Delivery Address</label>
                    <Textarea
                      required
                      value={address}
                      onChange={(e) => setAddress(e.currentTarget.value)}
                      placeholder="Street address, city, state, ZIP code"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-4">
              <Button variant="secondary" onClick={handleBack} disabled={currentStep === 0 || loading}>
                Back
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button onClick={handleNext} disabled={loading}>
                  Next
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? "Submitting..." : "Submit Order"}
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          <Card variant="glass" className="p-6 space-y-4">
            <MascotSlot variant="customBuilderHelper" />
            <div className="text-sm text-muted">
              <p className="font-medium mb-2">Building Your Custom Shirt</p>
              <p>Follow the steps to create your unique design. Our team will review and bring it to life!</p>
            </div>
          </Card>

          <Card variant="soft3D" className="p-4 space-y-2">
            <div className="font-medium">Quick Summary</div>
            <div className="text-sm space-y-1">
              <div>Product: {selectedProductData?.name || "Not selected"}</div>
              <div>Placements: {selectedPlacements.length}</div>
              <div>Designs: {designAssets.length}</div>
              <div className="font-bold pt-2">Est. Total: ${estimatedTotal.toFixed(2)}</div>
            </div>
          </Card>
          <DesignAssistant onApplyTemplate={applyTemplatePlacements} />
        </div>
      </div>
    </div>
  );
}
