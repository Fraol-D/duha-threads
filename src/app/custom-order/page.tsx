"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Stepper } from "@/components/ui/Stepper";
import { MascotSlot } from "@/components/ui/MascotSlot";
import { fadeInUp } from "@/lib/motion";
import { DesignPreview } from "@/components/DesignPreview";
import { BaseShirtColor } from "@/config/baseShirts";
import { DesignAssistant } from "@/components/DesignAssistant";
import { logEvent } from "@/lib/loggerEvents";

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
  type PlacementArea = 'front' | 'back' | 'left_chest' | 'right_chest';
  interface PlacementConfig {
    id: string;
    area: PlacementArea;
    verticalPosition: 'upper' | 'center' | 'lower';
    designType: 'text' | 'image';
    designText?: string;
    designFont?: keyof typeof FONT_MAP;
    designColor?: string;
    designImageUrl?: string | null;
    localImagePreviewUrl?: string | null;
  }
  const [enabledAreas, setEnabledAreas] = useState<PlacementArea[]>(['front']);
  const [placements, setPlacements] = useState<PlacementConfig[]>([{
    id: 'front-1', area: 'front', verticalPosition: 'upper', designType: 'text', designText: '', designFont: 'sans', designColor: '#000000'
  }]);
  const [activePlacementId, setActivePlacementId] = useState<string | null>('front-1');
  const [previewMode, setPreviewMode] = useState<'front'|'back'>('front');
  const [quantity, setQuantity] = useState<number>(1);
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
    if (currentStep === 'design') {
      if (placements.length === 0) { setError('Enable at least one placement'); return; }
      for (const p of placements) {
        if (p.designType === 'text' && (!p.designText || p.designText.trim() === '')) { setError(`Add text for ${p.area} or switch type`); return; }
        if (p.designType === 'image' && !p.designImageUrl) { setError(`Upload image for ${p.area} or switch type`); return; }
      }
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
      const payload = {
        baseColor: selectedBaseColor,
        quantity,
        deliveryName: deliveryName || 'Customer',
        deliveryAddress,
        phoneNumber: deliveryPhone,
        notes: notes || null,
        placements: placements.map(p => ({
          id: p.id,
          area: p.area,
          verticalPosition: p.verticalPosition,
          designType: p.designType,
          designText: p.designType==='text' ? (p.designText ?? '').trim() || null : null,
          designFont: p.designType==='text' ? FONT_MAP[(p.designFont ?? 'sans')].family : null,
          designColor: p.designType==='text' ? p.designColor || null : null,
          designImageUrl: p.designType==='image' ? p.designImageUrl || null : null,
        })
        ),
      };
      const res = await fetch('/api/custom-orders', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const data = await res.json().catch(()=>({})); throw new Error(data.error || 'Failed to create custom order'); }
      const data = await res.json();
      const orderId = data.orderId || data.customOrderId; // backward compat
      logEvent({ type: 'custom_order_completed', entityId: orderId });
      router.push(`/custom-order/confirmation/${orderId}`);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Submit failed'); } finally { setLoading(false); }
  }

  function applyTemplatePlacements(payload: { placements: { placementKey: string; type: string; imageUrl?: string | null; text?: string | null; font?: string | null; color?: string | null }[] }) {
    const first = payload.placements[0];
    if (!first) return;
    // Map template to first existing placement (front if present else create front)
    setPlacements(prev => {
      const frontIdx = prev.findIndex(p=>p.area==='front');
      if (frontIdx >=0) {
        const updated = [...prev];
        if (first.type==='image' && first.imageUrl) {
          updated[frontIdx].designType='image';
          updated[frontIdx].designImageUrl=first.imageUrl;
          updated[frontIdx].localImagePreviewUrl=first.imageUrl;
        } else if (first.type==='text' && first.text) {
          updated[frontIdx].designType='text';
          updated[frontIdx].designText=first.text;
          updated[frontIdx].designColor=first.color || '#000000';
        }
        return updated;
      }
      const newPlacement: PlacementConfig = {
        id: 'front-1', area:'front', verticalPosition:'upper', designType: first.type==='image'?'image':'text',
        designText: first.type==='text'? first.text || '' : '',
        designFont: 'sans', designColor: first.type==='text' ? first.color || '#000000' : '#000000',
        designImageUrl: first.type==='image'? first.imageUrl || null : null,
        localImagePreviewUrl: first.type==='image'? first.imageUrl || null : null,
      };
      return [...prev, newPlacement];
    });
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
              <div className="space-y-6">
                <h2 className="text-section-title">Placements</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(['front','back','left_chest','right_chest'] as PlacementArea[]).map(area => {
                    const enabled = enabledAreas.includes(area);
                    return (
                      <label key={area} className={`soft-3d px-3 py-2 rounded text-xs flex items-center gap-2 cursor-pointer ${enabled?'ring-2 ring-token':''}`}>
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => {
                            setEnabledAreas(prev => prev.includes(area) ? prev.filter(a=>a!==area) : [...prev, area]);
                            setPlacements(prev => {
                              const exists = prev.find(p=>p.area===area);
                              if (exists) {
                                if (enabled) { // turning off
                                  return prev.filter(p=>p.area!==area);
                                }
                                return prev; // already exists and enabling again
                              } else {
                                if (!enabled) { // turning on
                                  const newP: PlacementConfig = { id: `${area}-1`, area, verticalPosition: 'upper', designType:'text', designText:'', designFont:'sans', designColor:'#000000', designImageUrl: null, localImagePreviewUrl: null };
                                  setActivePlacementId(newP.id);
                                  if (area === 'back') setPreviewMode('back'); else setPreviewMode('front');
                                  return [...prev, newP];
                                }
                              }
                              return prev;
                            });
                            // Auto-switch preview when enabling a side
                            if (!enabled) {
                              if (area === 'back') setPreviewMode('back');
                              else if (area === 'front' || area === 'left_chest' || area === 'right_chest') setPreviewMode('front');
                            }
                          }}
                          className="accent-current"
                        />
                        {area==='left_chest'?'Left chest': area==='right_chest'?'Right chest': area==='front'?'Front':'Back'}
                      </label>
                    );
                  })}
                </div>
                <div className="space-y-4">
                  {placements.map(p => (
                    <Card
                      key={p.id}
                      className="p-4 space-y-3"
                      onClick={() => { setActivePlacementId(p.id); if (p.area === 'back') setPreviewMode('back'); else setPreviewMode('front'); }}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wide">{p.area.replace(/_/g,' ')}</h3>
                        <div className="flex gap-2">
                          <button type="button" onClick={()=>setPlacements(prev => prev.map(x => x.id===p.id ? { ...x, designType:'text', designText: x.designText ?? '', designFont: x.designFont ?? 'sans', designColor: x.designColor ?? '#000000' } : x))} className={`px-2 py-1 rounded text-[10px] soft-3d ${p.designType==='text'?'ring-2 ring-token':''}`}>Text</button>
                          <button type="button" onClick={()=>setPlacements(prev => prev.map(x => x.id===p.id ? { ...x, designType:'image', designImageUrl: x.designImageUrl ?? null } : x))} className={`px-2 py-1 rounded text-[10px] soft-3d ${p.designType==='image'?'ring-2 ring-token':''}`}>Image</button>
                        </div>
                      </div>
                      {(p.area==='front' || p.area==='back') && (
                        <div className="flex gap-2 flex-wrap">
                          {(['upper','center','lower'] as const).map(v => (
                            <button key={v} type="button" onClick={()=>setPlacements(prev => prev.map(x => x.id===p.id ? { ...x, verticalPosition:v } : x))} className={`soft-3d px-2 py-1 rounded text-[10px] ${p.verticalPosition===v?'ring-2 ring-token':''}`}>{v}</button>
                          ))}
                        </div>
                      )}
                      {p.designType==='text' && (
                        <div className="space-y-3">
                          <div className="space-y-1"><label className="text-[10px] font-medium">Text</label><Input value={p.designText ?? ''} onFocus={()=>setActivePlacementId(p.id)} onChange={(e)=>{ const val = e.currentTarget.value; setPlacements(prev => prev.map(x => x.id===p.id ? { ...x, designText: val } : x)); }} placeholder={`Text for ${p.area}`} /></div>
                          <div className="space-y-1"><label className="text-[10px] font-medium">Font</label><div className="flex flex-wrap gap-1">{(Object.keys(FONT_MAP) as Array<keyof typeof FONT_MAP>).map(k => (
                            <button key={k} type="button" onClick={()=>setPlacements(prev => prev.map(x => x.id===p.id ? { ...x, designFont:k } : x))} className={`soft-3d px-2 py-1 rounded text-[10px] ${p.designFont===k?'ring-2 ring-token':''}`}>{FONT_MAP[k].label}</button>
                          ))}</div></div>
                          <div className="space-y-1"><label className="text-[10px] font-medium">Color</label><div className="flex flex-wrap gap-1">{TEXT_COLORS.map(c => (
                            <button key={c.value} type="button" onClick={()=>setPlacements(prev => prev.map(x => x.id===p.id ? { ...x, designColor:c.value } : x))} className={`h-7 w-7 rounded-full flex items-center justify-center ${p.designColor===c.value?'ring-2 ring-token':''}`}><span className={`block h-5 w-5 rounded-full ${c.swatch}`}></span></button>
                          ))}</div></div>
                        </div>
                      )}
                      {p.designType==='image' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-medium">Upload Image</label>
                          <input type="file" accept="image/*" onChange={async (e)=>{
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const localUrl = URL.createObjectURL(file);
                            setPlacements(prev => prev.map(x => x.id===p.id ? { ...x, localImagePreviewUrl: localUrl } : x));
                            setLoading(true);
                            const fd = new FormData();
                            fd.append('file', file);
                            fd.append('placementKey', p.area);
                            try {
                              const res = await fetch('/api/uploads/custom-design', { method:'POST', body: fd });
                              if (!res.ok) throw new Error('Upload failed');
                              const data = await res.json();
                              setPlacements(prev => prev.map(x => x.id===p.id ? { ...x, designImageUrl: data.imageUrl } : x));
                            } catch { setError('Image upload failed'); } finally { setLoading(false); }
                          }} />
                          {p.localImagePreviewUrl && (<Image src={p.localImagePreviewUrl} alt="Preview" width={64} height={64} className="w-16 h-16 object-contain" />)}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}
            {currentStep==='design' && (
              <div className="space-y-8">
                <h2 className="text-section-title">Design Summary</h2>
                <div className="space-y-2 text-xs">
                  {placements.map(p => (
                    <div key={p.id} className="flex justify-between border-b border-muted pb-1">
                      <span>{p.area.replace(/_/g,' ')}: {p.designType==='text' ? (p.designText?.slice(0,18) || 'text') : 'image'}</span>
                      <span>{p.verticalPosition}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {currentStep==='review' && (
              <div className="space-y-6">
                <h2 className="text-section-title">Review & Delivery</h2>
                <Card variant="soft3D" className="p-4 space-y-4">
                  <div className="text-sm"><span className="font-medium">Base Shirt:</span> {selectedBaseColor==='black'?'Black':'White'}</div>
                  <div className="space-y-2 text-xs">
                    <div className="font-medium">Placements:</div>
                    {placements.map(p => (
                      <div key={p.id} className="flex justify-between border-b border-muted pb-1">
                        <span>{p.area.replace(/_/g,' ')}: {p.designType==='text' ? (p.designText?.slice(0,24)||'Text') : (p.designImageUrl ? 'Image' : 'Image (pending)')} </span>
                        <span>{(p.area==='front' || p.area==='back') ? p.verticalPosition : 'fixed'}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <div className="text-[10px] font-medium mb-1">Front Preview</div>
                      <DesignPreview
                        baseColor={selectedBaseColor}
                        mode="front"
                        placements={placements.map(p => ({
                          id:p.id,
                          area:p.area,
                          verticalPosition:p.verticalPosition,
                          designType:p.designType,
                          designText:p.designType==='text'?(p.designText ?? '') : null,
                          designFont:p.designType==='text'?FONT_MAP[(p.designFont ?? 'sans')].family: null,
                          designColor:p.designType==='text'?p.designColor: null,
                          designImageUrl:p.designType==='image'? (p.designImageUrl || p.localImagePreviewUrl || null) : null,
                        }))}
                        overlayPlacementKey={(function(){
                          const active = placements.find(pl=>pl.id===activePlacementId);
                          if (!active) return undefined;
                          if (active.area==='back') return undefined;
                          return active.area==='left_chest' ? 'chest_left' : active.area==='right_chest' ? 'chest_right' : active.area;
                        })()}
                        overlayType={'placeholder'}
                        overlayVerticalPosition={placements.find(pl=>pl.id===activePlacementId)?.verticalPosition ?? 'upper'}
                      />
                    </div>
                    <div>
                      <div className="text-[10px] font-medium mb-1">Back Preview</div>
                      <DesignPreview
                        baseColor={selectedBaseColor}
                        mode="back"
                        placements={placements.map(p => ({
                          id:p.id,
                          area:p.area,
                          verticalPosition:p.verticalPosition,
                          designType:p.designType,
                          designText:p.designType==='text'?(p.designText ?? '') : null,
                          designFont:p.designType==='text'?FONT_MAP[(p.designFont ?? 'sans')].family: null,
                          designColor:p.designType==='text'?p.designColor: null,
                          designImageUrl:p.designType==='image'? (p.designImageUrl || p.localImagePreviewUrl || null) : null,
                        }))}
                        overlayPlacementKey={(function(){
                          const active = placements.find(pl=>pl.id===activePlacementId);
                          if (!active) return undefined;
                          if (active.area!=='back') return undefined;
                          return 'back';
                        })()}
                        overlayType={'placeholder'}
                        overlayVerticalPosition={placements.find(pl=>pl.id===activePlacementId)?.verticalPosition ?? 'upper'}
                      />
                    </div>
                  </div>
                  <div className="text-sm flex items-center gap-2 pt-2"><span className="font-medium">Quantity:</span>
                    <div className="inline-flex items-center gap-2">
                      <button type="button" disabled={quantity<=1} onClick={()=>setQuantity(q=>Math.max(1,q-1))} className="px-2 py-1 rounded border border-muted text-xs">-</button>
                      <span className="min-w-[2ch] text-center font-medium">{quantity}</span>
                      <button type="button" disabled={quantity>=20} onClick={()=>setQuantity(q=>Math.min(20,q+1))} className="px-2 py-1 rounded border border-muted text-xs">+</button>
                    </div>
                  </div>
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
          <Card variant="soft3D" className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Live Preview</span>
              <div className="flex gap-2">
                <button type="button" onClick={()=>setPreviewMode('front')} className={`px-2 py-1 rounded text-xs soft-3d ${previewMode==='front'?'ring-2 ring-token':''}`}>Front</button>
                <button type="button" onClick={()=>setPreviewMode('back')} className={`px-2 py-1 rounded text-xs soft-3d ${previewMode==='back'?'ring-2 ring-token':''}`}>Back</button>
              </div>
            </div>
            <DesignPreview
              baseColor={selectedBaseColor}
              mode={previewMode}
              placements={placements.map(p => ({
                id: p.id,
                area: p.area,
                verticalPosition: p.verticalPosition,
                designType: p.designType,
                designText: p.designType==='text' ? (p.designText ?? '') : null,
                designFont: p.designType==='text' ? FONT_MAP[(p.designFont ?? 'sans')].family : null,
                designColor: p.designType==='text' ? p.designColor : null,
                designImageUrl: p.designType==='image' ? p.designImageUrl || p.localImagePreviewUrl || null : null,
              }))}
              overlayPlacementKey={(function(){
                const active = placements.find(pl=>pl.id===activePlacementId);
                if (!active) return undefined;
                if (previewMode==='front' && active.area==='back') return undefined;
                if (previewMode==='back' && active.area!=='back') return undefined;
                return active.area==='left_chest' ? 'chest_left' : active.area==='right_chest' ? 'chest_right' : active.area;
              })()}
              overlayType={'placeholder'}
              overlayVerticalPosition={placements.find(pl=>pl.id===activePlacementId)?.verticalPosition ?? 'upper'}
            />
            <div className="pt-2 flex gap-2">
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
