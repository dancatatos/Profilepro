/* Public entrypoint for the Credibly AI layer. */

export {
  isAIConfigured,
  geminiText,
  geminiJSON,
  geminiStream,
  parseJSON,
  AINotConfiguredError,
} from "./client";
export {
  generateProfileFlow,
  generateFunnelFlow,
  cloneRewriteFlow,
  auditProfileFlow,
  rewriteFlow,
  assistantStreamFlow,
  type FlowResult,
} from "./flows";
export { applyGeneratedContent } from "./generators";
export { AI_ACTIONS, QUICK_ACTIONS, type QuickAction } from "./actions";
export { profileContentSchema, auditSchema, funnelContentSchema } from "./schemas";
