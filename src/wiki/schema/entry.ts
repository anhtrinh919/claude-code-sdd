import { z } from "zod";

export const AGENT_VALUES = ["ba", "spec", "frontend", "backend", "review", "general"] as const;
export const TRIGGER_VALUES = ["phase-wrap", "friction", "manual", "auto-commit"] as const;

export const AgentSchema = z.enum(AGENT_VALUES);
export const TriggerSchema = z.enum(TRIGGER_VALUES);

export type Agent = z.infer<typeof AgentSchema>;
export type Trigger = z.infer<typeof TriggerSchema>;

export const EntryFrontmatterSchema = z.object({
  title: z.string().min(1),
  tags: z.array(z.string()),
  created: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.string().min(1),
  agent: AgentSchema.default("general"),
  trigger: TriggerSchema.default("auto-commit"),
  phase: z.number().int().optional(),
});

export const WikiEntrySchema = EntryFrontmatterSchema.extend({
  body: z.string().min(1),
});

export type EntryFrontmatter = z.infer<typeof EntryFrontmatterSchema>;
export type WikiEntry = z.infer<typeof WikiEntrySchema>;
