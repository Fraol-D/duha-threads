import { NextRequest, NextResponse } from 'next/server';
import '@/lib/db/connection';

// Deterministic mock generator based on prompt tokens
function mockSuggestions(prompt: string) {
  const baseTokens = prompt.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const hasMinimal = baseTokens.includes('minimal');
  const hasLogo = baseTokens.includes('logo');
  const hasText = baseTokens.includes('text');
  const hasBack = baseTokens.includes('back');

  const suggestions = [] as any[];
  // Suggestion 1: minimal front logo
  suggestions.push({
    name: hasMinimal ? 'Minimal Front Logo' : 'Clean Front Emblem',
    description: 'Simple emblem centered on front. Easy to customize.',
    previewImageUrl: null,
    placements: [
      {
        placementKey: 'front',
        type: hasLogo ? 'image' : 'text',
        imageUrl: hasLogo ? 'https://example.com/mock-logo.png' : undefined,
        text: hasLogo ? undefined : 'Your Brand',
        font: 'Inter',
        color: '#ffffff',
      },
    ],
    aiPromptUsed: prompt,
  });
  // Suggestion 2: front text + back detail if back requested
  suggestions.push({
    name: hasBack ? 'Front & Back Concept' : 'Text Focus Layout',
    description: 'Balanced text layout with optional back element.',
    previewImageUrl: null,
    placements: [
      {
        placementKey: 'front',
        type: 'text',
        text: hasText ? 'Statement' : 'Brand',
        font: 'Inter',
        color: '#ffffff',
      },
      ...(hasBack
        ? [
            {
              placementKey: 'back',
              type: 'text',
              text: 'Tagline',
              font: 'Inter',
              color: '#cccccc',
            },
          ]
        : []),
    ],
    aiPromptUsed: prompt,
  });
  return suggestions;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt } = body || {};
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt required' }, { status: 400 });
    }
    // TODO: Replace mockSuggestions with real AI provider integration later.
    const suggestedTemplates = mockSuggestions(prompt).slice(0, 3);
    return NextResponse.json({ suggestedTemplates });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to generate suggestions', detail: err.message }, { status: 500 });
  }
}