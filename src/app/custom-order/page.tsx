"use client";
import { useState, useEffect, useMemo } from "react";
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
import { DesignPreview } from "@/components/DesignPreview";
import { BaseShirtColor } from "@/config/baseShirts";
import { DesignAssistant } from "@/components/DesignAssistant";
import { logEvent } from "@/lib/loggerEvents";

interface DesignAsset { placementKey: string; type: 'image' | 'text'; sourceType: 'uploaded' | 'template' | 'ai_generated'; imageUrl?: string; text?: string; font?: string; color?: string; }
type BuilderStep = 'baseShirt' | 'placements' | 'design' | 'review';
const FONT_MAP: Record<string, { label: string; class: string; family: string }> = {
  sans: { label: 'Sans', class: 'font-sans', family: 'Inter, system-ui, sans-serif' },
  serif: { label: 'Serif', class: 'font-serif', family: 'Georgia, serif' },
  mono: { label: 'Mono', class: 'font-mono', family: 'Courier New, monospace' },
  script: { label: 'Script', class: 'font-[cursive]', family: 'cursive' },
  display: { label: 'Display', class: 'font-bold tracking-wide', family: 'Impact, system-ui, sans-serif' },
};
const TEXT_COLORS = [
  { value: '#000000', label: 'Black', swatch: 'bg-black' },
  { value: '#ffffff', label: 'White', swatch: 'bg-white border border-muted' },
  { value: '#ff4747', label: 'Red', swatch: 'bg-red-600' },
  { value: '#facc15', label: 'Yellow', swatch: 'bg-yellow-400' },
  { value: '#2563eb', label: 'Blue', swatch: 'bg-blue-600' },
];

export default function CustomOrderBuilderPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<BuilderStep>('baseShirt');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBaseColor, setSelectedBaseColor] = useState<BaseShirtColor>('white');
  const [selectedPlacement, setSelectedPlacement] = useState<'front'|'back'|'chest_left'|'chest_right'>('front');
  const [verticalPosition, setVerticalPosition] = useState<'upper'|'center'|'lower'>('upper');
  const [designType, setDesignType] = useState<'text'|'image'>('text');
  const [designText, setDesignText] = useState('');
  const [designFont, setDesignFont] = useState<keyof typeof FONT_MAP>('sans');
  const [designTextColor, setDesignTextColor] = useState('#000000');
  const [designImagePreviewUrl, setDesignImagePreviewUrl] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryEmail, setDeliveryEmail] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetch('/api/user/me').then(r=>r.json()).then(data => {
      if (data.user) {
        setDeliveryEmail(data.user.email || '');
        setDeliveryName(data.user.name || '');
      }
    }).catch(()=>{});
  }, []);

  useEffect(() => { if (currentStep === 'placements') logEvent({ type: 'custom_order_started', entityId: null }); }, [currentStep]);

  const steps: Array<{ key: BuilderStep; label: string; status: 'completed'|'current'|'upcoming'; clickable: boolean }> = useMemo(() => {
    const order: BuilderStep[] = ['baseShirt','placements','design','review'];
    const activeIdx = order.indexOf(currentStep);
    return order.map((key,i) => ({
      key,
      label: `${i+1}. ${key==='baseShirt'?'Base Shirt': key==='placements'?'Placements': key==='design'?'Design':'Review & Delivery'}`,
      status: (i < activeIdx ? 'completed' : i===activeIdx ? 'current' : 'upcoming') as 'completed'|'current'|'upcoming',
      clickable: i < activeIdx,
    }));
  }, [currentStep]);

  function goToStep(s: BuilderStep) { setCurrentStep(s); }

  function handleNext() {
    if (currentStep === 'placements' && !selectedPlacement) { setError('Choose a placement'); return; }
    if (currentStep === 'design') {
      if (designType === 'text' && designText.trim().length === 0) { setError('Add some text'); return; }
      if (designType === 'image' && !uploadedImageUrl) { setError('Upload an image'); return; }
    }
    setError(null);
    const order: BuilderStep[] = ['baseShirt','placements','design','review'];
    const idx = order.indexOf(currentStep);
    if (idx < order.length - 1) setCurrentStep(order[idx+1]);
  }
  function handleBack() { setError(null); const order: BuilderStep[] = ['baseShirt','placements','design','review']; const idx = order.indexOf(currentStep); if (idx>0) setCurrentStep(order[idx-1]); }

  async function handleSubmit() {
    setLoading(true); setError(null);
    try {
      if (currentStep !== 'review') { setError('Go to Review to submit'); setLoading(false); return; }
      const designAssets: DesignAsset[] = [];
      if (designType==='text' && designText.trim()) designAssets.push({ placementKey: selectedPlacement, type:'text', sourceType:'uploaded', text:designText.trim(), font: FONT_MAP[designFont].family, color: designTextColor });
      if (designType==='image' && uploadedImageUrl) designAssets.push({ placementKey: selectedPlacement, type:'image', sourceType:'uploaded', imageUrl: uploadedImageUrl });
      const payload = {
        baseShirt: { productId: 'base-shirt-simple', color: selectedBaseColor, size: 'standard', quantity: 1 },
        placements: [{ placementKey: selectedPlacement, label: selectedPlacement.replace(/_/g,' ') }],
        designAssets,
        notes,
        delivery: { address: deliveryAddress, phone: deliveryPhone, email: deliveryEmail },
        builderSimple: { selectedBaseColor, selectedPlacement, designType, designText, designImagePreviewUrl },
      };
      const res = await fetch('/api/custom-orders', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const data = await res.json().catch(()=>({})); throw new Error(data.error || 'Failed to create custom order'); }
      const data = await res.json();
      logEvent({ type: 'custom_order_completed', entityId: data.customOrderId });
      router.push(`/custom-orders/${data.customOrderId}`);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Submit failed'); } finally { setLoading(false); }
  }

  function applyTemplatePlacements(payload: { placements: { placementKey: string; type: string; imageUrl?: string | null; text?: string | null; font?: string | null; color?: string | null }[] }) {
    const first = payload.placements[0];
    if (!first) return;
    if (['front','back','chest_left','chest_right'].includes(first.placementKey)) {
      setSelectedPlacement(first.placementKey as 'front'|'back'|'chest_left'|'chest_right');
    }
    if (first.type==='image' && first.imageUrl) { setDesignType('image'); setUploadedImageUrl(first.imageUrl); setDesignImagePreviewUrl(first.imageUrl); }
    else if (first.type==='text' && first.text) { setDesignType('text'); setDesignText(first.text); setDesignTextColor(first.color || '#000000'); }
    setCurrentStep('design');
  }

  const estimatedTotal = useMemo(()=>20+15,[]); // static demo pricing

  return (
    <div className="py-8">
      <motion.div variants={fadeInUp} initial="hidden" animate="show"><h1 className="text-hero mb-8">Custom Order Builder</h1></motion.div>
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
        <div className="flex-1 space-y-6">
          <Card variant="glass" className="p-6">
            <Stepper steps={steps} onStepClick={(k)=>goToStep(k as BuilderStep)} />
            <div className="mt-2 text-xs text-muted lg:hidden">Step {steps.findIndex(s=>s.key===currentStep)+1} of 4</div>
          </Card>
          <Card className="p-6 space-y-6">
            {currentStep==='baseShirt' && (
              <div className="space-y-4">
                <h2 className="text-section-title">Base Shirt</h2>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Choose Color</label>
                  <Select value={selectedBaseColor} onChange={(e)=>setSelectedBaseColor(e.currentTarget.value as BaseShirtColor)}>
                    <option value="white">White</option>
                    <option value="black">Black</option>
                  </Select>
                  <div className="flex gap-2 pt-2">
                    {(['white','black'] as BaseShirtColor[]).map(c => (
                      <button key={c} type="button" onClick={()=>setSelectedBaseColor(c)} className={`h-10 w-10 rounded-full flex items-center justify-center border ${selectedBaseColor===c?'ring-2 ring-token border-token':'border-muted'} bg-[--surface]`}>
                        <span className={`block h-6 w-6 rounded-full ${c==='white'?'bg-white border border-muted':'bg-black'}`}></span>
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted">Select your base shirt color. This will update the live preview immediately.</p>
              </div>
            )}
            {currentStep==='placements' && (
              <div className="space-y-4">
                <h2 className="text-section-title">Choose Placement</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['front','back','chest_left','chest_right'] as Array<'front'|'back'|'chest_left'|'chest_right'>).map(p => (
                    <button key={p} type="button" onClick={()=>setSelectedPlacement(p)} className={`soft-3d px-3 py-2 rounded text-sm ${selectedPlacement===p?'ring-2 ring-token':''}`}>{p==='front'?'Front':p==='back'?'Back':p==='chest_left'?'Left chest':'Right chest'}</button>
                  ))}
                </div>
                {(selectedPlacement==='front' || selectedPlacement==='back') && (
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-medium">Vertical position</label>
                    <div className="flex gap-2 flex-wrap">
                      {([
                        { key: 'upper', label: selectedPlacement==='front' ? 'Upper chest' : 'Upper back' },
                        { key: 'center', label: selectedPlacement==='front' ? 'Center' : 'Center back' },
                        { key: 'lower', label: selectedPlacement==='front' ? 'Lower' : 'Lower back' },
                      ] as const).map(v => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={()=>setVerticalPosition(v.key)}
                          className={`soft-3d px-3 py-1.5 rounded text-xs ${verticalPosition===v.key?'ring-2 ring-token':''}`}
                        >{v.label}</button>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted">Switch placement and vertical position to see the marker move.</p>
              </div>
            )}
            {currentStep==='design' && (
              <div className="space-y-6">
                <h2 className="text-section-title">Design Your Print</h2>
                <div className="flex gap-2">
                  <button type="button" onClick={()=>setDesignType('text')} className={`soft-3d px-3 py-1.5 rounded text-sm ${designType==='text'?'ring-2 ring-token':''}`}>Text design</button>
                  <button type="button" onClick={()=>setDesignType('image')} className={`soft-3d px-3 py-1.5 rounded text-sm ${designType==='image'?'ring-2 ring-token':''}`}>Image design</button>
                </div>
                {designType==='text' && (
                  <div className="space-y-4">
                    <div className="space-y-2"><label className="text-sm font-medium">Text</label><Input value={designText} onChange={(e)=>setDesignText(e.currentTarget.value)} placeholder="Your phrase" /></div>
                    <div className="space-y-2"><label className="text-sm font-medium">Font Style</label><div className="flex flex-wrap gap-2">{(Object.keys(FONT_MAP) as Array<keyof typeof FONT_MAP>).map(k => (<button key={k} type="button" onClick={()=>setDesignFont(k)} className={`soft-3d px-3 py-1.5 rounded text-xs ${designFont===k?'ring-2 ring-token':''}`}>{FONT_MAP[k].label}</button>))}</div></div>
                    <div className="space-y-2"><label className="text-sm font-medium">Text Color</label><div className="flex gap-2 flex-wrap">{TEXT_COLORS.map(c => (<button key={c.value} type="button" onClick={()=>setDesignTextColor(c.value)} className={`h-8 w-8 rounded-full flex items-center justify-center ${designTextColor===c.value?'ring-2 ring-token':''}`}> <span className={`block h-6 w-6 rounded-full ${c.swatch}`}></span></button>))}</div></div>
                  </div>
                )}
                {designType==='image' && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Upload Image</label>
                    <input type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const localUrl = URL.createObjectURL(file); setDesignImagePreviewUrl(localUrl); setLoading(true); const fd = new FormData(); fd.append('file', file); fd.append('placementKey', selectedPlacement); try { const res = await fetch('/api/uploads/custom-design', { method: 'POST', body: fd }); if (!res.ok) throw new Error('Upload failed'); const data = await res.json(); setUploadedImageUrl(data.imageUrl); } catch { setError('Image upload failed'); } finally { setLoading(false); } }} />
                    {designImagePreviewUrl && (<Image src={designImagePreviewUrl} alt="Preview" width={96} height={96} className="w-24 h-24 object-contain" />)}
                  </div>
                )}
              </div>
            )}
            {currentStep==='review' && (
              <div className="space-y-6">
                <h2 className="text-section-title">Review & Delivery</h2>
                <Card variant="soft3D" className="p-4 space-y-2">
                  <div className="text-sm"><span className="font-medium">Base Shirt:</span> {selectedBaseColor==='black'?'Black':'White'}</div>
                  <div className="text-sm"><span className="font-medium">Placement:</span> {selectedPlacement.replace(/_/g,' ')}</div>
                  <div className="text-sm"><span className="font-medium">Design:</span> {designType==='text'?`Text (${designText.slice(0,20)||'None'})`: uploadedImageUrl ? 'Image uploaded':'None'}</div>
                  <div className="text-sm"><span className="font-medium">Estimated Total:</span> ${estimatedTotal.toFixed(2)}</div>
                </Card>
                <div className="space-y-3">
                  <div className="space-y-1"><label className="text-xs font-medium">Delivery Name</label><Input value={deliveryName} onChange={(e)=>setDeliveryName(e.currentTarget.value)} placeholder="Name" /></div>
                  <div className="space-y-1"><label className="text-xs font-medium">Email</label><Input type="email" required value={deliveryEmail} onChange={(e)=>setDeliveryEmail(e.currentTarget.value)} placeholder="you@example.com" /></div>
                  <div className="space-y-1"><label className="text-xs font-medium">Phone</label><Input type="tel" required value={deliveryPhone} onChange={(e)=>setDeliveryPhone(e.currentTarget.value)} placeholder="+123456789" /></div>
                  <div className="space-y-1"><label className="text-xs font-medium">Address</label><Textarea rows={3} required value={deliveryAddress} onChange={(e)=>setDeliveryAddress(e.currentTarget.value)} placeholder="Street, City, State" /></div>
                  <div className="space-y-1"><label className="text-xs font-medium">Notes (Optional)</label><Textarea rows={3} value={notes} onChange={(e)=>setNotes(e.currentTarget.value)} placeholder="Additional instructions" /></div>
                </div>
              </div>
            )}
            {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded">{error}</div>}
            <div className="flex items-center justify-between pt-2">
              <Button variant="secondary" onClick={handleBack} disabled={currentStep==='baseShirt' || loading}>Back</Button>
              {currentStep!=='review' ? (<Button onClick={handleNext} disabled={loading}>Next</Button>) : (<Button onClick={handleSubmit} disabled={loading || !deliveryAddress || !deliveryPhone || !deliveryEmail}>{loading?'Submitting...':'Place Custom Order'}</Button>)}
            </div>
          </Card>
        </div>
        <div className="lg:w-1/2 space-y-6 order-first lg:order-0">
          <Card variant="soft3D" className="p-4 space-y-2">
            <div className="font-medium">Live Preview</div>
            <DesignPreview
              baseColor={selectedBaseColor}
              overlayPlacementKey={selectedPlacement}
              overlayType={currentStep==='placements' ? 'placeholder' : designType==='text' && designText.trim() ? 'text' : designType==='image' && (designImagePreviewUrl || uploadedImageUrl) ? 'image' : (currentStep==='design' ? 'placeholder' : null)}
              overlayText={designType==='text' ? designText : undefined}
              overlayImageUrl={designType==='image' ? (designImagePreviewUrl || uploadedImageUrl) : undefined}
              overlayColor={designTextColor}
              overlayFont={FONT_MAP[designFont].family}
              overlayVerticalPosition={verticalPosition}
            />
            <div className="pt-3 flex gap-2">
              {(['white','black'] as BaseShirtColor[]).map(c => (
                <button key={c} type="button" onClick={()=>setSelectedBaseColor(c)} className={`h-9 w-9 rounded-full flex items-center justify-center border ${selectedBaseColor===c?'ring-2 ring-token border-token':'border-muted'} bg-[--surface]`}>
                  <span className={`block h-5 w-5 rounded-full ${c==='white'?'bg-white border border-muted':'bg-black'}`}></span>
                </button>
              ))}
            </div>
          </Card>
          <Card variant="glass" className="p-6 space-y-4">
            <MascotSlot variant="customBuilderHelper" />
            <div className="text-xs text-muted"><p className="font-medium mb-2">Wizard Guide</p><p>Progress through each step. The preview updates instantly with placement and design changes.</p></div>
          </Card>
          <DesignAssistant onApplyTemplate={applyTemplatePlacements} />
        </div>
      </div>
    </div>
  );
}
