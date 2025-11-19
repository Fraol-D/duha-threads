"use client";
import { useEffect, useState } from 'react';
import { logEvent } from '@/lib/loggerEvents';

interface PlacementTemplate {
  placementKey: string;
  type: 'image' | 'text' | 'combo';
  imageUrl?: string | null;
  text?: string | null;
  font?: string | null;
  color?: string | null;
}

interface DesignTemplateDoc {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  previewImageUrl?: string;
  placements: PlacementTemplate[];
  tags: string[];
  usageCount: number;
}

interface AISuggestedTemplate {
  name: string;
  description: string;
  previewImageUrl?: string | null;
  placements: PlacementTemplate[];
  aiPromptUsed: string;
}

interface Props {
  onApplyTemplate: (t: { placements: PlacementTemplate[] }) => void;
}

export function DesignAssistant({ onApplyTemplate }: Props) {
  const [activeTab, setActiveTab] = useState<'templates' | 'history' | 'ai'>('templates');
  const [templates, setTemplates] = useState<DesignTemplateDoc[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestedTemplate[]>([]);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [search, tagFilter]);

  async function loadTemplates() {
    setLoadingTemplates(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (tagFilter) params.set('tag', tagFilter);
      const res = await fetch(`/api/templates?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTemplates(json.templates || []);
      }
    } finally {
      setLoadingTemplates(false);
    }
  }

  function handleViewTemplate(id: string) {
    setExpandedTemplate(expandedTemplate === id ? null : id);
    if (expandedTemplate !== id) {
      logEvent({ type: 'template_view', entityId: id });
    }
  }

  function handleApplyTemplate(t: DesignTemplateDoc | AISuggestedTemplate) {
    onApplyTemplate({ placements: t.placements });
    // If real template doc (has _id) log template_apply
    if ((t as any)._id) {
      logEvent({ type: 'template_apply', entityId: (t as any)._id });
    } else {
      // AI suggestion apply still counts
      logEvent({ type: 'template_apply', entityId: null, metadata: { source: 'ai' } });
    }
  }

  async function requestAISuggestions() {
    setAiLoading(true);
    setAiSuggestions([]);
    try {
      const res = await fetch('/api/ai/design-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      if (res.ok) {
        const json = await res.json();
        setAiSuggestions(json.suggestedTemplates || []);
      }
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="rounded-xl bg-[--surface]/60 backdrop-blur border border-muted p-4 flex flex-col gap-4 w-full md:w-80">
      <div className="flex gap-2 text-sm">
        {['templates','history','ai'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-3 py-1 rounded-full ${activeTab===tab? 'bg-[--surface] font-medium' : 'hover:bg-[--surface]/50'}`}
          >{tab === 'ai' ? 'AI Suggestion' : tab.charAt(0).toUpperCase()+tab.slice(1)}</button>
        ))}
      </div>
      {activeTab === 'templates' && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              placeholder="Search"
              value={search}
              onChange={e=>setSearch(e.target.value)}
              className="flex-1 rounded border border-muted bg-transparent px-2 py-1 text-sm"
            />
            <input
              placeholder="Tag"
              value={tagFilter}
              onChange={e=>setTagFilter(e.target.value)}
              className="w-28 rounded border border-muted bg-transparent px-2 py-1 text-sm"
            />
          </div>
          {loadingTemplates && <div className="text-xs opacity-70">Loading templates…</div>}
          <div className="flex flex-col gap-2 max-h-72 overflow-auto pr-1">
            {templates.map(t => (
              <div key={t._id} className="rounded-lg border border-muted/50 bg-[--surface]/40 p-2">
                <button
                  onClick={()=>handleViewTemplate(t._id)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="text-sm font-medium">{t.name}</span>
                  <span className="text-[10px] opacity-60">{t.usageCount} uses</span>
                </button>
                {expandedTemplate === t._id && (
                  <div className="mt-2 space-y-2 text-xs">
                    <p className="opacity-80">{t.description || 'No description.'}</p>
                    {t.tags?.length>0 && (
                      <div className="flex flex-wrap gap-1">
                        {t.tags.map(tag=>(<span key={tag} className="px-2 py-0.5 rounded-full bg-[--surface] text-[10px]">{tag}</span>))}
                      </div>
                    )}
                    <button
                      onClick={()=>handleApplyTemplate(t)}
                      className="w-full rounded bg-foreground/10 hover:bg-foreground/20 py-1 text-xs"
                    >Apply Template</button>
                  </div>
                )}
              </div>
            ))}
            {!loadingTemplates && templates.length === 0 && (
              <div className="text-xs opacity-60">No templates found.</div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'history' && (
        <div className="text-xs opacity-60">History coming soon…</div>
      )}
      {activeTab === 'ai' && (
        <div className="flex flex-col gap-2">
          <textarea
            value={aiPrompt}
            onChange={e=>setAiPrompt(e.target.value)}
            placeholder="Describe your idea (e.g. Minimal logo front)"
            className="min-h-[70px] rounded border border-muted bg-transparent p-2 text-xs"
          />
          <button
            onClick={requestAISuggestions}
            disabled={!aiPrompt || aiLoading}
            className="rounded bg-foreground/10 hover:bg-foreground/20 py-1 text-xs disabled:opacity-40"
          >{aiLoading?'Thinking…':'Suggest Design'}</button>
          <div className="flex flex-col gap-2 max-h-60 overflow-auto pr-1">
            {aiSuggestions.map((s,i)=>(
              <div key={i} className="rounded-lg border border-muted/50 bg-[--surface]/40 p-2">
                <div className="text-xs font-medium">{s.name}</div>
                <p className="text-[11px] opacity-70 mt-1">{s.description}</p>
                <button
                  onClick={()=>handleApplyTemplate(s)}
                  className="mt-2 w-full rounded bg-foreground/10 hover:bg-foreground/20 py-1 text-[11px]"
                >Apply Suggestion</button>
              </div>
            ))}
            {!aiLoading && aiSuggestions.length === 0 && (
              <div className="text-[11px] opacity-60">No suggestions yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}