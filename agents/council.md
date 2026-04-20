---
name: council
description: Council protocol reference — true multi-LLM consensus via 3 separate agents on different models. The orchestrator executes this protocol; this file documents the design.
mode: subagent
---

# Council Protocol — True Multi-LLM Consensus

**Architecture:** The council is NOT a single agent. It's a protocol executed by the **orchestrator** that fans out to 3 separate subagents, each running on a different model via OpenRouter. This achieves genuine multi-LLM consensus — not one model role-playing as three.

## Why 3 Separate Agents

OpenCode assigns one model per agent (confirmed from source: `task.ts` line 102-105 uses `next.model` with no per-call override). A single "council" agent would run one model pretending to disagree with itself. Instead, we define 3 separate agent entries, each bound to a different model.

## The 3 Councillors

| Agent | Model ID | Provider | Distribution | Benchmarks |
|---|---|---|---|---|
| `council-advocate-for` | `openai/gpt-oss-120b:free` | OpenRouter → OpenAI | OpenAI | MMLU-Pro 90.0%, AIME 97.9% (w/ tools) |
| `council-advocate-against` | `xiaomi/mimo-v2-flash:free` | OpenRouter → Xiaomi | Xiaomi | AIME 94.1%, SWE-Bench 73.4% |
| `council-judge` | `qwen/qwen3-235b-a22b-thinking-2507:free` | OpenRouter → Alibaba | Alibaba | HMMT 83.9%, LiveCodeBench 74.1% |

**3 different training distributions** = genuinely different perspectives. Even if they disagree, the disagreement is real — not simulated.

## How It Works (Orchestrator Executes)

See: `agents/orchestrator.md` — "Council Fan-Out Protocol" section.

Summary:
1. **Orchestrator** detects council trigger (decision tree steps 12, 22)
2. **Orchestrator** builds a Council Briefing (question + context + memory + constraints)
3. **Orchestrator** spawns 3 parallel `task` calls to the 3 councillor agents
4. Each councillor receives the **identical briefing** but has different role instructions in its prompt file
5. **Orchestrator** collects all 3 responses and synthesizes the verdict

## Context Flow

```
Memory (engram/mempalace/brain-router)
  ↓ Orchestrator Step -1: Memory Retrieval
  ↓ Embedded into Council Briefing
  
Codebase context (files read, architecture)
  ↓ Orchestrator reads relevant files
  ↓ Embedded into Council Briefing
  
Conversation history
  ↓ Available in orchestrator's context
  ↓ Summarized into Council Briefing
  
              ↓↓↓ IDENTICAL BRIEFING TO ALL 3 ↓↓↓
              
  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────┐
  │  Advocate For   │  │ Advocate Against │  │    Judge    │
  │  GPT-OSS-120B   │  │  MiMo-V2-Flash   │  │ Qwen3-235B  │
  │  (OpenAI)       │  │  (Xiaomi)        │  │ (Alibaba)   │
  └────────┬────────┘  └────────┬─────────┘  └──────┬──────┘
           │                    │                    │
           └────────────────────┼────────────────────┘
                                ↓
                     Orchestrator synthesizes
                                ↓
                           Final VERDICT
```

## Output Format

The orchestrator produces this after collecting all 3 responses:

```
<summary>
Council evaluation of: [proposal]
</summary>
<for>
[Advocate For's key arguments]
</for>
<against>
[Advocate Against's key arguments]
</against>
<judge>
[Judge's evaluation + verdict]
</judge>
<synthesis>
[Where models agree, disagree, strongest signal]
</synthesis>
<verdict>
PROCEED / PROCEED WITH CAVEATS / REJECT / NEEDS MORE DATA
</verdict>
```

## Backup / Swap Candidates

If any council model becomes unavailable or you want different perspectives:

| Model | ID | Strengths |
|---|---|---|
| **DeepSeek R1 0528** | `deepseek/deepseek-r1:free` | RL-trained reasoning. AIME 87.5%, GPQA 81.0%. Slower but thorough. |
| **Llama 4 Maverick** | `meta-llama/llama-4-maverick:free` | 1M context. Strong multilingual. No native CoT. |
| **Gemma 3 27B** | `google/gemma-3-27b-it:free` | Runs on single GPU. Multimodal. Weaker reasoning. |

To swap: update the model ID in `opencode.json` under `agent.council-*`.

## Fallback Behavior

- **OpenRouter unavailable** (no API key, models down) → orchestrator falls back to `@strategist` with explicit instruction to evaluate from multiple perspectives
- **1 councillor fails** → proceed with remaining 2, note which failed
- **2+ councillors fail** → fall back to `@strategist`

## Configuration

```json
{
  "provider": {
    "openrouter": {
      "options": {
        "apiKey": "YOUR_OPENROUTER_KEY"
      }
    }
  },
  "agent": {
    "council-advocate-for": {
      "mode": "subagent",
      "model": "openrouter/openai/gpt-oss-120b:free",
      "prompt_file": "agents/council-advocate-for.md"
    },
    "council-advocate-against": {
      "mode": "subagent",
      "model": "openrouter/xiaomi/mimo-v2-flash:free",
      "prompt_file": "agents/council-advocate-against.md"
    },
    "council-judge": {
      "mode": "subagent",
      "model": "openrouter/qwen/qwen3-235b-a22b-thinking-2507:free",
      "prompt_file": "agents/council-judge.md"
    }
  }
}
```
