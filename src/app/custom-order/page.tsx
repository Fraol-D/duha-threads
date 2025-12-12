"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Stepper } from "@/components/ui/Stepper";
import { MascotSlot } from "@/components/ui/MascotSlot";
import { fadeInUp } from "@/lib/motion";
import { DesignPreviewCanvas, type CanvasPlacement, PREVIEW_ASPECT_RATIO, DEFAULT_FONT_SIZE_CONTROL } from "@/components/preview/DesignPreviewCanvas";
import { BaseShirtColor } from "@/config/baseShirts";
import { resolveBasePreviewImage } from "@/lib/preview/baseImage";
import { DesignAssistant } from "@/components/DesignAssistant";
import { logEvent } from "@/lib/loggerEvents";
import type { TextBoxWidthPreset } from "@/types/custom-order";

// Stable placement order constant (outside component to avoid hook deps)
const PLACEMENT_ORDER_REF = Object.freeze(['front','back','left_chest','right_chest'] as const);

type BuilderStep = 'baseShirt' | 'placements' | 'design' | 'review';
const FONT_OPTIONS = [
  { id: 'poppins', label: 'Poppins', family: '"Poppins", "Segoe UI", system-ui, sans-serif', keywords: ['modern','rounded'] },
  { id: 'montserrat', label: 'Montserrat', family: '"Montserrat", "Segoe UI", system-ui, sans-serif', keywords: ['bold','clean'] },
  { id: 'playfair', label: 'Playfair Display', family: '"Playfair Display", "Times New Roman", serif', keywords: ['serif','elegant'] },
  { id: 'bebas', label: 'Bebas Neue', family: '"Bebas Neue", Impact, sans-serif', keywords: ['display','uppercase'] },
  { id: 'raleway', label: 'Raleway', family: '"Raleway", "Helvetica Neue", sans-serif', keywords: ['light','sans'] },
  { id: 'lora', label: 'Lora Serif', family: '"Lora", Georgia, serif', keywords: ['serif','story'] },
  { id: 'script', label: 'Dancing Script', family: '"Dancing Script", "Brush Script MT", cursive', keywords: ['script','handwritten'] },
  { id: 'mono', label: 'JetBrains Mono', family: '"JetBrains Mono", "Courier New", monospace', keywords: ['mono','tech'] },
] as const;
type FontId = (typeof FONT_OPTIONS)[number]['id'];
const FONT_LOOKUP: Record<string, (typeof FONT_OPTIONS)[number]> = FONT_OPTIONS.reduce((acc, option) => {
  acc[option.id] = option;
  return acc;
}, {} as Record<string, (typeof FONT_OPTIONS)[number]>);
const DEFAULT_FONT_ID: FontId = 'poppins';
const FONT_SIZE_MIN = 24;
const FONT_SIZE_MAX = 72;
const TEXT_WIDTH_PRESETS: { id: TextBoxWidthPreset; label: string; helper: string }[] = [
  { id: 'narrow', label: 'Pocket', helper: 'Chest badge' },
  { id: 'standard', label: 'Classic', helper: 'Centered text' },
  { id: 'wide', label: 'Wide', helper: 'Full chest' },
];
const getFontOption = (id?: FontId) => FONT_LOOKUP[id ?? DEFAULT_FONT_ID] ?? FONT_LOOKUP[DEFAULT_FONT_ID];
const clampFontSize = (value: number) => Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, value));
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
  // Static order constant (outside hooks to avoid dependency churn)
  // Static order constant: defined outside render hooks so linter treats as stable
  interface PlacementConfig {
    id: string;
    area: PlacementArea;
    verticalPosition: 'upper' | 'center' | 'lower';
    designType: 'text' | 'image';
    designText?: string;
    designFont?: FontId;
    fontSize?: number;
    textWidthPreset?: TextBoxWidthPreset;
    designColor?: string;
    designImageUrl?: string | null;
    localImagePreviewUrl?: string | null;
  }
  const [enabledAreas, setEnabledAreas] = useState<PlacementArea[]>(['front']);
  const [placements, setPlacements] = useState<PlacementConfig[]>([{
    id: 'front-1',
    area: 'front',
    verticalPosition: 'upper',
    designType: 'text',
    designText: '',
    designFont: DEFAULT_FONT_ID,
    fontSize: DEFAULT_FONT_SIZE_CONTROL,
    textWidthPreset: 'standard',
    designColor: '#000000',
  }]);
  const [activePlacementId, setActivePlacementId] = useState<string | null>('front-1');
  const [previewMode, setPreviewMode] = useState<'front'|'back'>('front');
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [fontSearch, setFontSearch] = useState('');
  useEffect(() => {
    const element = previewContainerRef.current;
    if (!element) return;
    const updateSize = () => {
      const nextWidth = Math.min(Math.max(element.clientWidth, 240), 420);
      setPreviewSize({ width: nextWidth, height: nextWidth * PREVIEW_ASPECT_RATIO });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const canvasPlacements = useMemo<CanvasPlacement[]>(() => placements.map((p) => {
    const font = getFontOption(p.designFont);
    const isFrontOrBack = p.area === 'front' || p.area === 'back';
    return {
      id: p.id,
      area: p.area,
      verticalPosition: p.verticalPosition,
      designType: p.designType,
      designText: p.designType === 'text' ? (p.designText ?? '') : null,
      designFont: p.designType === 'text' ? font.family : null,
      designColor: p.designType === 'text' ? (p.designColor || '#000000') : null,
      designImageUrl: p.designType === 'image' ? (p.designImageUrl || p.localImagePreviewUrl || null) : null,
      fontSize: p.designType === 'text' ? (p.fontSize ?? DEFAULT_FONT_SIZE_CONTROL) : null,
      textBoxWidth: isFrontOrBack ? (p.textWidthPreset ?? 'standard') : null,
    };
  }), [placements]);
  const frontCanvasPlacements = useMemo(() => filterPlacementsBySide(canvasPlacements, 'front'), [canvasPlacements]);
  const backCanvasPlacements = useMemo(() => filterPlacementsBySide(canvasPlacements, 'back'), [canvasPlacements]);
  const previewPlacements = previewMode === 'front' ? frontCanvasPlacements : backCanvasPlacements;
  const previewBaseImageUrl = useMemo(() => resolveBasePreviewImage(selectedBaseColor, previewMode), [selectedBaseColor, previewMode]);
  const showGuides = currentStep === 'placements';
  const activePlacement = useMemo(() => placements.find((pl) => pl.id === activePlacementId) || null, [placements, activePlacementId]);
  const highlightedPlacementId = useMemo(() => {
    if (!showGuides || !activePlacement) return null;
    if (activePlacement.area === 'back') return previewMode === 'back' ? activePlacement.id : null;
    return previewMode === 'front' ? activePlacement.id : null;
  }, [showGuides, activePlacement, previewMode]);
  const reviewPreviewWidth = 200;
  const reviewPreviewHeight = reviewPreviewWidth * PREVIEW_ASPECT_RATIO;
  const [quantity, setQuantity] = useState<number>(1);
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryEmail, setDeliveryEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [sharePublicly, setSharePublicly] = useState(false);
  const [shareTitle, setShareTitle] = useState('');
  const [shareDescription, setShareDescription] = useState('');

  useEffect(() => {
    setFontSearch('');
  }, [activePlacementId]);

  const filteredFonts = useMemo(() => {
    const term = fontSearch.trim().toLowerCase();
    if (!term) return FONT_OPTIONS;
    return FONT_OPTIONS.filter((option) =>
      option.label.toLowerCase().includes(term) || option.keywords.some((keyword) => keyword.includes(term))
    );
  }, [fontSearch]);

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

  // Ordered enabled placement configs for navigation
  const orderedEnabledPlacements = useMemo(() => {
    return PLACEMENT_ORDER_REF
      .filter(a => enabledAreas.includes(a))
      .map(a => placements.find(p=>p.area===a))
      .filter(Boolean) as PlacementConfig[];
  }, [enabledAreas, placements]);

  const areaLabel = (area: PlacementArea) => area==='left_chest' ? 'Left Chest' : area==='right_chest' ? 'Right Chest' : area==='front' ? 'Front' : 'Back';

  const placementHasContent = useCallback((p: PlacementConfig): boolean => {
    if (!enabledAreas.includes(p.area)) return true; // not required
    if (p.designType === 'image') return !!p.designImageUrl;
    return !!(p.designText && p.designText.trim().length > 0);
  }, [enabledAreas]);

  // Keep active pointing to first enabled if current becomes invalid
  useEffect(() => {
    if (currentStep !== 'placements') return;
    if (!orderedEnabledPlacements.length) { setActivePlacementId(null); return; }
    const currentActive = orderedEnabledPlacements.find(p=>p.id===activePlacementId);
    if (!currentActive) {
      setActivePlacementId(orderedEnabledPlacements[0].id);
      setPreviewMode(orderedEnabledPlacements[0].area === 'back' ? 'back' : 'front');
    }
  }, [currentStep, orderedEnabledPlacements, activePlacementId]);

  function handleNext() {
    if (currentStep === 'placements') {
      if (!orderedEnabledPlacements.length) { setError('Enable at least one placement'); return; }
      const idx = orderedEnabledPlacements.findIndex(p=>p.id===activePlacementId);
      const current = idx >=0 ? orderedEnabledPlacements[idx] : orderedEnabledPlacements[0];
      if (!placementHasContent(current)) {
        setError(`Please add ${current.designType==='image'?'an image':'text'} for ${areaLabel(current.area)} before continuing.`);
        setActivePlacementId(current.id);
        setPreviewMode(current.area === 'back' ? 'back' : 'front');
        return;
      }
      if (idx < orderedEnabledPlacements.length - 1) {
        const next = orderedEnabledPlacements[idx+1];
        setActivePlacementId(next.id);
        setPreviewMode(next.area === 'back' ? 'back' : 'front');
        setError(null);
        return;
      }
      const firstInvalid = orderedEnabledPlacements.find(p=>!placementHasContent(p));
      if (firstInvalid) {
        setActivePlacementId(firstInvalid.id);
        setPreviewMode(firstInvalid.area === 'back' ? 'back' : 'front');
        setError(`Please complete ${areaLabel(firstInvalid.area)} before moving on.`);
        return;
      }
      setError(null);
      setCurrentStep('design');
      return;
    }
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

  function handleBack() {
    setError(null);
    if (currentStep === 'placements') {
      const idx = orderedEnabledPlacements.findIndex(p=>p.id===activePlacementId);
      if (idx > 0) {
        const prev = orderedEnabledPlacements[idx-1];
        setActivePlacementId(prev.id);
        setPreviewMode(prev.area === 'back' ? 'back' : 'front');
        return;
      }
      setCurrentStep('baseShirt');
      return;
    }
    const order: BuilderStep[] = ['baseShirt','placements','design','review'];
    const idx = order.indexOf(currentStep);
    if (idx>0) setCurrentStep(order[idx-1]);
  }

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
        placements: placements.map((p) => {
          const font = getFontOption(p.designFont);
          return {
            id: p.id,
            area: p.area,
            verticalPosition: p.verticalPosition,
            designType: p.designType,
            designText: p.designType === 'text' ? (p.designText ?? '').trim() || null : null,
            designFont: p.designType === 'text' ? font.family : null,
            designFontSize: p.designType === 'text' ? clampFontSize(p.fontSize ?? DEFAULT_FONT_SIZE_CONTROL) : null,
            textBoxWidth: p.designType === 'text' && (p.area === 'front' || p.area === 'back') ? (p.textWidthPreset ?? 'standard') : null,
            designColor: p.designType === 'text' ? p.designColor || null : null,
            designImageUrl: p.designType === 'image' ? p.designImageUrl || null : null,
          };
        }),
        sharePublicly,
        showcaseTitle: sharePublicly ? (shareTitle.trim() || null) : null,
        showcaseDescription: sharePublicly ? (shareDescription.trim() || null) : null,
      };
      const res = await fetch('/api/custom-orders', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const data = await res.json().catch(()=>({})); throw new Error(data.error || 'Failed to create custom order'); }
      const data = await res.json();
      const orderId = data.orderId || data.customOrderId;
      logEvent({ type: 'custom_order_completed', entityId: orderId });
      router.push(`/custom-order/confirmation/${orderId}`);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Submit failed'); } finally { setLoading(false); }
  }

  function applyTemplatePlacements(payload: { placements: { placementKey: string; type: string; imageUrl?: string | null; text?: string | null; font?: string | null; color?: string | null }[] }) {
    const first = payload.placements[0];
    if (!first) return;
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
          updated[frontIdx].designFont=DEFAULT_FONT_ID;
          updated[frontIdx].fontSize=DEFAULT_FONT_SIZE_CONTROL;
          updated[frontIdx].textWidthPreset='standard';
        }
        return updated;
      }
      const newPlacement: PlacementConfig = {
        id: 'front-1', area:'front', verticalPosition:'upper', designType: first.type==='image'?'image':'text',
        designText: first.type==='text'? first.text || '' : '',
        designFont: DEFAULT_FONT_ID,
        fontSize: DEFAULT_FONT_SIZE_CONTROL,
        textWidthPreset: 'standard',
        designColor: first.type==='text' ? first.color || '#000000' : '#000000',
        designImageUrl: first.type==='image'? first.imageUrl || null : null,
        localImagePreviewUrl: first.type==='image'? first.imageUrl || null : null,
      };
      return [...prev, newPlacement];
    });
    setCurrentStep('design');
  }

  const unitEstimate = useMemo(() => {
    const BASE_PRICE = 20;
    const PLACEMENT_COST = 15;
    return BASE_PRICE + (PLACEMENT_COST * placements.length);
  }, [placements.length]);
  const estimatedTotal = useMemo(() => unitEstimate * quantity, [unitEstimate, quantity]);

  return (
    <div className="py-8">
      <motion.div variants={fadeInUp} initial="hidden" animate="show"><h1 className="text-hero mb-8">Custom Order Builder</h1></motion.div>
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
        <div className="flex-1 space-y-6 w-full">
          <Card variant="glass" className="p-6 shadow-sm border-none">
            <Stepper steps={steps} onStepClick={(k)=>goToStep(k as BuilderStep)} />
            <div className="mt-2 text-xs text-muted lg:hidden">Step {steps.findIndex(s=>s.key===currentStep)+1} of 4</div>
          </Card>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="p-6 space-y-6 shadow-sm border-none bg-[--surface]">
                {currentStep==='baseShirt' && (
                  <div className="space-y-4">
                    <h2 className="text-section-title">Base Shirt</h2>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Choose Color</label>
                      <div className="flex gap-3 pt-2">
                        {(['white','black'] as BaseShirtColor[]).map(c => (
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            key={c} 
                            type="button" 
                            onClick={()=>setSelectedBaseColor(c)} 
                            className={`h-12 w-12 rounded-full flex items-center justify-center shadow-md transition-all ${selectedBaseColor===c?'ring-2 ring-token ring-offset-2':''}`}
                          >
                            <span className={`block h-10 w-10 rounded-full ${c==='white'?'bg-white border border-muted/20':'bg-black'}`}></span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted">Select your base shirt color. This will update the live preview immediately.</p>
                  </div>
                )}
                {currentStep==='placements' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-section-title">Placements</h2>
                      <span className="text-xs text-muted">Select areas to customize</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(['front','back','left_chest','right_chest'] as PlacementArea[]).map(area => {
                        const enabled = enabledAreas.includes(area);
                        return (
                          <motion.label 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            key={area} 
                            className={`relative overflow-hidden px-3 py-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all ${enabled ? 'bg-primary text-primary-foreground shadow-md' : 'bg-[--bg] hover:bg-muted/50 text-muted-foreground'}`}
                          >
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={() => {
                                setEnabledAreas(prev => prev.includes(area) ? prev.filter(a=>a!==area) : [...prev, area]);
                                setPlacements(prev => {
                                  const exists = prev.find(p=>p.area===area);
                                  if (exists) {
                                    if (enabled) {
                                      const filtered = prev.filter(p=>p.area!==area);
                                      if (activePlacementId === exists.id) {
                                        setActivePlacementId(filtered[0]?.id || null);
                                        if (filtered[0]) setPreviewMode(filtered[0].area === 'back' ? 'back' : 'front');
                                      }
                                      return filtered;
                                    }
                                    return prev;
                                  } else {
                                    if (!enabled) {
                                      const newP: PlacementConfig = {
                                        id: `${area}-1`,
                                        area,
                                        verticalPosition: 'upper',
                                        designType:'text',
                                        designText:'',
                                        designFont: DEFAULT_FONT_ID,
                                        fontSize: DEFAULT_FONT_SIZE_CONTROL,
                                        textWidthPreset: area === 'front' || area === 'back' ? 'standard' : undefined,
                                        designColor:'#000000',
                                        designImageUrl: null,
                                        localImagePreviewUrl: null,
                                      };
                                      setActivePlacementId(newP.id);
                                      if (area === 'back') setPreviewMode('back'); else setPreviewMode('front');
                                      return [...prev, newP];
                                    }
                                  }
                                  return prev;
                                });
                                if (!enabled) {
                                  if (area === 'back') setPreviewMode('back');
                                  else setPreviewMode('front');
                                }
                              }}
                              className="sr-only"
                            />
                            {area==='left_chest'?'Left Chest': area==='right_chest'?'Right Chest': area==='front'?'Front':'Back'}
                          </motion.label>
                        );
                      })}
                    </div>
                    
                    <div className="space-y-4">
                      <AnimatePresence mode="wait">
                      {(() => {
                        const active = orderedEnabledPlacements.find(p=>p.id===activePlacementId);
                        if (!active) return <motion.div key="none" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="text-center py-8 text-sm text-muted">Enable a placement above to configure it.</motion.div>;
                        const idx = orderedEnabledPlacements.findIndex(p=>p.id===activePlacementId);
                        
                        return (
                          <motion.div key={active.id} initial={{opacity:0, x: 10}} animate={{opacity:1, x: 0}} exit={{opacity:0, x: -10}} transition={{duration:0.2}}>
                          <div className="bg-[--bg] rounded-2xl p-5 shadow-sm space-y-5">
                            <div className="flex items-center justify-between border-b border-muted/20 pb-4">
                              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">{areaLabel(active.area)}</h3>
                              <div className="flex bg-muted/30 p-1 rounded-lg">
                                <button
                                  type="button"
                                  onClick={() => setPlacements(prev => prev.map(x => x.id === active.id ? { ...x, designType: 'text' } : x))}
                                  className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-all ${active.designType==='text'?'bg-white shadow-sm text-black':'text-muted-foreground hover:text-foreground'}`}
                                >
                                  Text
                                </button>
                                <button 
                                  type="button" 
                                  onClick={()=>setPlacements(prev => prev.map(x => x.id===active.id ? { ...x, designType:'image' } : x))} 
                                  className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-all ${active.designType==='image'?'bg-white shadow-sm text-black':'text-muted-foreground hover:text-foreground'}`}
                                >
                                  Image
                                </button>
                              </div>
                            </div>

                            {(active.area==='front' || active.area==='back') && (
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Position</label>
                                <div className="flex gap-2">
                                  {(['upper','center','lower'] as const).map(v => (
                                    <button 
                                      key={v} 
                                      type="button" 
                                      onClick={()=>setPlacements(prev => prev.map(x => x.id===active.id ? { ...x, verticalPosition:v } : x))} 
                                      className={`flex-1 py-2 rounded-lg text-[10px] font-medium transition-all ${active.verticalPosition===v?'bg-black text-white shadow-md':'bg-muted/30 text-muted-foreground hover:bg-muted/50'}`}
                                    >
                                      {v.charAt(0).toUpperCase() + v.slice(1)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {active.designType==='text' && (
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Content</label>
                                  <Input 
                                    value={active.designText ?? ''} 
                                    onChange={(e)=>setPlacements(prev => prev.map(x => x.id===active.id ? { ...x, designText: e.currentTarget.value } : x))} 
                                    placeholder={`Enter text for ${areaLabel(active.area)}`}
                                    className="bg-[--surface] border-none shadow-inner"
                                  />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Font</label>
                                    <select 
                                      value={active.designFont}
                                      onChange={(e) => setPlacements(prev => prev.map(x => x.id === active.id ? { ...x, designFont: e.target.value as any } : x))}
                                      className="w-full rounded-lg bg-[--surface] border-none text-xs py-2.5 px-3 shadow-sm focus:ring-2 ring-black/5"
                                    >
                                      {FONT_OPTIONS.map(f => (
                                        <option key={f.id} value={f.id}>{f.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Size</label>
                                    <div className="flex items-center gap-2 bg-[--surface] rounded-lg p-1 shadow-sm">
                                      <input
                                        type="range"
                                        min={FONT_SIZE_MIN}
                                        max={FONT_SIZE_MAX}
                                        step={2}
                                        value={clampFontSize(active.fontSize ?? DEFAULT_FONT_SIZE_CONTROL)}
                                        onChange={(e) => {
                                          const next = clampFontSize(Number(e.currentTarget.value));
                                          setPlacements((prev) => prev.map((x) => (x.id === active.id ? { ...x, fontSize: next } : x)));
                                        }}
                                        className="flex-1 h-1 bg-muted rounded-full appearance-none cursor-pointer accent-black ml-2"
                                      />
                                      <span className="text-[10px] font-mono w-8 text-center">{active.fontSize}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Color</label>
                                  <div className="flex flex-wrap gap-2">
                                    {TEXT_COLORS.map(c => (
                                      <motion.button 
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        key={c.value} 
                                        type="button" 
                                        onClick={()=>setPlacements(prev => prev.map(x => x.id===active.id ? { ...x, designColor:c.value } : x))} 
                                        className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${active.designColor===c.value?'ring-2 ring-offset-1 ring-black scale-110':''}`}
                                      >
                                        <span className={`block h-full w-full rounded-full ${c.swatch} shadow-sm`}></span>
                                      </motion.button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {active.designType==='image' && (
                              <div className="space-y-4">
                                <div className="border-2 border-dashed border-muted rounded-xl p-8 text-center hover:bg-muted/20 transition-colors cursor-pointer relative">
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={async (e)=>{
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      const localUrl = URL.createObjectURL(file);
                                      setPlacements(prev => prev.map(x => x.id===active.id ? { ...x, localImagePreviewUrl: localUrl } : x));
                                      setLoading(true);
                                      const fd = new FormData();
                                      fd.append('file', file);
                                      fd.append('placementKey', active.area);
                                      try {
                                        const res = await fetch('/api/uploads/custom-design', { method:'POST', body: fd });
                                        if (!res.ok) throw new Error('Upload failed');
                                        const data = await res.json();
                                        setPlacements(prev => prev.map(x => x.id===active.id ? { ...x, designImageUrl: data.imageUrl } : x));
                                      } catch { setError('Image upload failed'); } finally { setLoading(false); }
                                    }} 
                                  />
                                  {active.localImagePreviewUrl ? (
                                    <div className="relative w-24 h-24 mx-auto">
                                      <Image src={active.localImagePreviewUrl} alt="Preview" fill className="object-contain" />
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                                        <span className="text-xl">+</span>
                                      </div>
                                      <p className="text-xs text-muted-foreground font-medium">Click to upload image</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          </motion.div>
                        );
                      })()}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
                {currentStep==='design' && (
                  <div className="space-y-8">
                    <h2 className="text-section-title">Design Summary</h2>
                    <div className="space-y-3">
                      {placements.map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-[--bg] p-3 rounded-lg shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                              {p.area.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium">{areaLabel(p.area)}</div>
                              <div className="text-xs text-muted-foreground">{p.designType==='text' ? (p.designText || 'Empty') : 'Image Uploaded'}</div>
                            </div>
                          </div>
                          <div className="text-xs font-medium bg-muted/30 px-2 py-1 rounded">{p.verticalPosition}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {currentStep==='review' && (
                  <div className="space-y-6">
                    <h2 className="text-section-title">Review & Delivery</h2>
                    <Card variant="soft3D" className="p-6 space-y-6 border-none shadow-md">
                      <div className="flex items-center justify-between border-b border-muted/10 pb-4">
                        <span className="font-medium">Base Shirt</span>
                        <span className="capitalize bg-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">{selectedBaseColor}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Front Preview</div>
                          <div className="bg-white rounded-xl overflow-hidden shadow-inner">
                            <DesignPreviewCanvas
                              baseImageUrl={resolveBasePreviewImage(selectedBaseColor, 'front')}
                              placements={frontCanvasPlacements}
                              width={reviewPreviewWidth}
                              height={reviewPreviewHeight}
                              mode="full"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Back Preview</div>
                          <div className="bg-white rounded-xl overflow-hidden shadow-inner">
                            <DesignPreviewCanvas
                              baseImageUrl={resolveBasePreviewImage(selectedBaseColor, 'back')}
                              placements={backCanvasPlacements}
                              width={reviewPreviewWidth}
                              height={reviewPreviewHeight}
                              mode="full"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-muted/10">
                        <span className="font-medium">Quantity</span>
                        <div className="flex items-center gap-3 bg-[--bg] rounded-lg p-1 shadow-sm">
                          <button type="button" disabled={quantity<=1} onClick={()=>setQuantity(q=>Math.max(1,q-1))} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white transition-colors">-</button>
                          <span className="w-8 text-center font-bold">{quantity}</span>
                          <button type="button" disabled={quantity>=20} onClick={()=>setQuantity(q=>Math.min(20,q+1))} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white transition-colors">+</button>
                        </div>
                      </div>
                      
                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Per Shirt</span> <span className="font-medium">${unitEstimate.toFixed(2)}</span></div>
                        <div className="flex justify-between text-lg font-bold"><span className="">Total</span> <span>${estimatedTotal.toFixed(2)}</span></div>
                      </div>
                    </Card>

                    <Card className="p-6 space-y-4 border-none shadow-sm bg-[--surface]">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-bold">Community Showcase</h3>
                          <p className="text-xs text-muted-foreground mt-1">Feature this design in our gallery?</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={sharePublicly} onChange={(e) => setSharePublicly(e.currentTarget.checked)} />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                        </label>
                      </div>
                      {sharePublicly && (
                        <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} className="space-y-3 pt-2">
                          <Input
                            value={shareTitle}
                            onChange={(e) => setShareTitle(e.currentTarget.value)}
                            maxLength={80}
                            placeholder="Design Title"
                            className="bg-white border-none shadow-sm"
                          />
                          <Textarea
                            rows={2}
                            value={shareDescription}
                            onChange={(e) => setShareDescription(e.currentTarget.value)}
                            maxLength={400}
                            placeholder="Tell the story..."
                            className="bg-white border-none shadow-sm"
                          />
                        </motion.div>
                      )}
                    </Card>

                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Delivery Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input value={deliveryName} onChange={(e)=>setDeliveryName(e.currentTarget.value)} placeholder="Full Name" className="bg-white border-none shadow-sm" />
                        <Input type="email" required value={deliveryEmail} onChange={(e)=>setDeliveryEmail(e.currentTarget.value)} placeholder="Email" className="bg-white border-none shadow-sm" />
                        <Input type="tel" required value={deliveryPhone} onChange={(e)=>setDeliveryPhone(e.currentTarget.value)} placeholder="Phone" className="bg-white border-none shadow-sm" />
                        <Input value={deliveryAddress} onChange={(e)=>setDeliveryAddress(e.currentTarget.value)} placeholder="Address" className="bg-white border-none shadow-sm md:col-span-2" />
                        <Textarea rows={2} value={notes} onChange={(e)=>setNotes(e.currentTarget.value)} placeholder="Order Notes (Optional)" className="bg-white border-none shadow-sm md:col-span-2" />
                      </div>
                    </div>
                  </div>
                )}
                {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-4 rounded-xl flex items-center gap-2"><span className="font-bold">Error:</span> {error}</div>}
                <div className="flex items-center justify-between pt-4">
                  <Button variant="secondary" onClick={handleBack} disabled={currentStep==='baseShirt' || loading} className="shadow-sm">Back</Button>
                  {currentStep!=='review' ? (
                    <Button onClick={handleNext} disabled={loading} className="shadow-lg shadow-primary/20">{currentStep==='placements' ? 'Next Step' : 'Next'}</Button>
                  ) : (
                    <Button onClick={handleSubmit} disabled={loading || !deliveryAddress || !deliveryPhone || !deliveryEmail} className="shadow-lg shadow-primary/20 w-full md:w-auto">{loading?'Submitting...':'Place Order'}</Button>
                  )}
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
        
        <div className="lg:w-1/2 space-y-6 order-first lg:order-0 lg:sticky lg:top-24 lg:self-start transition-all duration-300">
          <Card variant="soft3D" className="p-4 space-y-3 border-none shadow-xl bg-white/50 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm uppercase tracking-wider">Live Preview</span>
              <div className="flex bg-muted/20 p-1 rounded-lg">
                <button type="button" onClick={()=>setPreviewMode('front')} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${previewMode==='front'?'bg-white shadow-sm text-black':'text-muted-foreground'}`}>Front</button>
                <button type="button" onClick={()=>setPreviewMode('back')} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${previewMode==='back'?'bg-white shadow-sm text-black':'text-muted-foreground'}`}>Back</button>
              </div>
            </div>
            <div ref={previewContainerRef} className="w-full relative group">
              {previewSize.width > 0 ? (
                <DesignPreviewCanvas
                  baseImageUrl={previewBaseImageUrl}
                  placements={previewPlacements}
                  width={previewSize.width}
                  height={previewSize.height}
                  mode="full"
                  showGuides={showGuides}
                  activePlacementId={highlightedPlacementId}
                />
              ) : (
                <div className="w-full rounded-xl bg-muted/30 animate-pulse" style={{ aspectRatio: '3 / 4' }} />
              )}
            </div>
            <div className="pt-2 flex justify-center gap-3">
              {(['white','black'] as BaseShirtColor[]).map(c => (
                <button key={c} type="button" onClick={()=>setSelectedBaseColor(c)} className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${selectedBaseColor===c?'scale-110 ring-2 ring-offset-2 ring-black':''}`}>
                  <span className={`block h-full w-full rounded-full ${c==='white'?'bg-white border border-muted':'bg-black'} shadow-sm`}></span>
                </button>
              ))}
            </div>
          </Card>
          <Card variant="glass" className="p-6 space-y-4 border-none shadow-lg">
            <MascotSlot variant="customBuilderHelper" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <p className="font-bold text-foreground mb-1">Design Tips</p>
              <p>Use high-resolution images for best print quality. Keep text within the safe zones.</p>
            </div>
          </Card>
          <DesignAssistant onApplyTemplate={applyTemplatePlacements} />
        </div>
      </div>
    </div>
  );
}

function filterPlacementsBySide(placements: CanvasPlacement[], side: 'front' | 'back') {
  if (side === 'back') return placements.filter((placement) => placement.area === 'back');
  return placements.filter((placement) => placement.area !== 'back');
}
