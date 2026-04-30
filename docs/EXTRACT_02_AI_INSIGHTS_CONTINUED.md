# PART 2B: AI Insights System - Continued

> Continuation of AI Insights extraction - Focal Point Detector completion and Groq Integration

---

## Complete Focal Point Detector (Continued)

Continuing from where the main file was cut off:

```typescript
      { id: 'china', name: 'China', patterns: ['china', 'chinese', 'beijing', 'xi'] },
      { id: 'israel', name: 'Israel', patterns: ['israel', 'israeli', 'gaza', 'netanyahu'] },
      { id: 'ukraine', name: 'Ukraine', patterns: ['ukraine', 'ukrainian', 'kyiv', 'zelensky'] },
      { id: 'north_korea', name: 'North Korea', patterns: ['north korea', 'pyongyang', 'kim'] },
      { id: 'syria', name: 'Syria', patterns: ['syria', 'syrian', 'damascus', 'assad'] },
      { id: 'yemen', name: 'Yemen', patterns: ['yemen', 'yemeni', 'houthi'] },
      { id: 'lebanon', name: 'Lebanon', patterns: ['lebanon', 'lebanese', 'hezbollah'] },
    ];
    
    for (const country of countries) {
      if (country.patterns.some(p => lowerText.includes(p))) {
        entities.push({ id: country.id, name: country.name, type: 'country' });
      }
    }
    
    // Person patterns
    const people = [
      { id: 'putin', name: 'Putin', patterns: ['putin'] },
      { id: 'xi', name