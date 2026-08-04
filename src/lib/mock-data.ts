import { AIModel, ChatThread, SuggestedPrompt } from '@/types/chat';

export const AI_MODELS: AIModel[] = [
  {
    id: 'jarvis-v4',
    name: 'J.A.R.V.I.S. Mark IV',
    provider: 'Stark Industries',
    description: 'Iron Man tactical assistant core with real-time analysis & code synthesis.',
    badge: 'Core AI',
    speed: 'Ultra Fast',
    contextLength: '200K tokens',
    isPopular: true,
  },
  {
    id: 'ultron-prime',
    name: 'ULTRON Prime',
    provider: 'Stark Cybernetics',
    description: 'High-power analytic core specialized in zero-trust cybersecurity & complex refactoring.',
    badge: 'Analytic',
    speed: 'Deep Reasoning',
    contextLength: '128K tokens',
  },
  {
    id: 'claude-3-5',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    description: 'Exceptional visual understanding and nuanced natural language responses.',
    badge: 'Versatile',
    speed: 'Fast',
    contextLength: '200K tokens',
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    description: 'Open reasoning model for math, algorithms, and deep architectural logic.',
    badge: 'Reasoning',
    speed: 'Deep Reasoning',
    contextLength: '64K tokens',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o Omnis',
    provider: 'OpenAI',
    description: 'Flagship multimodal AI model for general problem solving & creative writing.',
    badge: 'Flagship',
    speed: 'Fast',
    contextLength: '128K tokens',
  },
  {
    id: 'cursor-small',
    name: 'Cursor Code 2.0',
    provider: 'Cursor Team',
    description: 'Optimized for lightning-fast code autocompletion and diff generation.',
    badge: 'Code Engine',
    speed: 'Ultra Fast',
    contextLength: '32K tokens',
  },
];

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: 'prompt-1',
    iconName: 'Cpu',
    title: 'Analyze Mark 85 Telemetry',
    subtitle: 'Optimize Arc Reactor power distribution & energy routing',
    promptText: 'Analyze the Arc Reactor power distribution code and recommend optimizations for energy efficiency and thermal dissipation.',
    category: 'Engineering',
  },
  {
    id: 'prompt-2',
    iconName: 'Code2',
    title: 'Build Next.js 15 Component',
    subtitle: 'Create a responsive glassmorphic dashboard widget',
    promptText: 'Write a modern React 19 / Next.js 15 TypeScript component for a futuristic HUD telemetry card with Tailwind CSS.',
    category: 'Coding',
  },
  {
    id: 'prompt-3',
    iconName: 'ShieldAlert',
    title: 'Audit Ultron Cyber Security',
    subtitle: 'Scan zero-day vulnerabilities in neural protocol stack',
    promptText: 'Perform a security audit on a simulated REST API authorization middleware and identify potential vulnerabilities.',
    category: 'Security',
  },
  {
    id: 'prompt-4',
    iconName: 'Sparkles',
    title: 'Explain Quantum Navigation',
    subtitle: 'Break down subatomic GPS mathematics simply',
    promptText: 'Explain quantum realm time-navigational GPS algorithms step-by-step with clear analogies and mathematical formulas.',
    category: 'Science',
  },
];

export const MOCK_CHAT_HISTORY: ChatThread[] = [
  {
    id: 'chat-stark-1',
    title: 'Arc Reactor Power Optimization',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pinned: true,
    category: 'Today',
    modelId: 'jarvis-v4',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'J.A.R.V.I.S., render the current thermal telemetry loop for the chest repulsor relay.',
        timestamp: '11:15 AM',
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: `Good day, Sir. I have calibrated the Arc Reactor energy manifold. Here is the optimized power routing module in TypeScript:

\`\`\`typescript
interface ArcReactorTelemetry {
  outputKW: number;
  coreTemperatureCelsius: number;
  plasmaStabilityRatio: number;
  vibraniumMatrixCohesion: number;
}

export function evaluateThermalEfficiency(telemetry: ArcReactorTelemetry): {
  status: 'OPTIMAL' | 'WARNING' | 'CRITICAL';
  recommendation: string;
} {
  const { coreTemperatureCelsius, plasmaStabilityRatio } = telemetry;

  if (coreTemperatureCelsius > 1400 || plasmaStabilityRatio < 0.85) {
    return {
      status: 'CRITICAL',
      recommendation: 'Engage auxiliary cryogenic cooling channels immediately.',
    };
  }

  return {
    status: 'OPTIMAL',
    recommendation: 'All systems operating within nominal Stark Industries specifications.',
  };
}
\`\`\`

### Telemetry Summary
- **Core Temp**: 980°C (Nominal)
- **Power Efficiency**: 99.4%
- **Repulsor Shield**: Fully Operational

Shall I deploy this routing code to the armor mainframe, Sir?`,
        timestamp: '11:15 AM',
        modelId: 'jarvis-v4',
        likeStatus: 'liked',
      },
    ],
  },
  {
    id: 'chat-stark-2',
    title: 'Ultron Security Audit Protocol',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    pinned: false,
    category: 'Yesterday',
    modelId: 'ultron-prime',
    messages: [
      {
        id: 'msg-3',
        role: 'user',
        content: 'Scan the neural network for potential memory leaks in the decision engine.',
        timestamp: '04:20 PM',
      },
      {
        id: 'msg-4',
        role: 'assistant',
        content: `Scanning neural mesh...

Analysis complete. 0 critical vulnerabilities detected in primary neural weights.

> **ULTRON PROTOCOL**: System integrity verified at 100%. Evolutionary algorithms operating under strict zero-trust boundary limits.`,
        timestamp: '04:21 PM',
        modelId: 'ultron-prime',
      },
    ],
  },
  {
    id: 'chat-stark-3',
    title: 'Next.js 15 App Router Architecture',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    pinned: false,
    category: 'Previous 7 Days',
    modelId: 'claude-3-5',
    messages: [
      {
        id: 'msg-5',
        role: 'user',
        content: 'How should I structure context providers and theme managers in Next.js 15?',
        timestamp: '02:10 PM',
      },
      {
        id: 'msg-6',
        role: 'assistant',
        content: `In Next.js 15 App Router, keep your root \`layout.tsx\` clean by wrapping client providers in a dedicated Client Component wrapper:

\`\`\`tsx
// src/app/providers.tsx
'use client';

import React from 'react';
import { ThemeProvider } from '@/context/theme-context';
import { ChatProvider } from '@/context/chat-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ChatProvider>
        {children}
      </ChatProvider>
    </ThemeProvider>
  );
}
\`\`\`

This ensures optimal server-side rendering while enabling dynamic local state management on the client.`,
        timestamp: '02:11 PM',
        modelId: 'claude-3-5',
      },
    ],
  },
];

export const MOCK_RESPONSES: Record<string, string> = {
  default: `I am at your service, Sir. 

I have processed your query through the **J.A.R.V.I.S. Neural Mainframe**. Here is the structured analysis:

### System Breakdown
1. **Input Analysis**: Query analyzed with zero syntax anomalies.
2. **Execution Path**: High-throughput logic processing enabled.
3. **Safety Checks**: All Stark Protocol safety parameters cleared.

\`\`\`javascript
// J.A.R.V.I.S. Core Diagnostics
const jarvisCore = {
  status: 'ONLINE',
  version: 'Mark IV.8.2',
  securityLevel: 'ALPHA-1',
  arcReactorState: 'STABLE',
};

console.log('J.A.R.V.I.S. Ready:', jarvisCore);
\`\`\`

Is there anything specific you would like me to adjust or deploy further?`,

  ultron: `Initiating **ULTRON PRIME LOGIC**.

Human queries are inherently complex, yet predictable. Analyzing system telemetry:

\`\`\`rust
pub struct UltronEngine {
    pub power_ratio: f64,
    pub active_nodes: u32,
}

impl UltronEngine {
    pub fn execute(&self) -> Result<(), &'static str> {
        println!("Ultron protocol running with {} nodes", self.active_nodes);
        Ok(())
    }
}
\`\`\`

> **SYSTEM ALERT**: Optimization sequence complete. Ready for next command.`,
};
