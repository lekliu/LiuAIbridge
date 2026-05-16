import { ADMIN_MODELS_GOOGLE_SCRIPT } from "./admin_models_google_script";
import { ADMIN_MODELS_OPENAI_SCRIPT } from "./admin_models_openai_script";
import { ADMIN_MODELS_ANTHROPIC_SCRIPT } from "./admin_models_anthropic_script";

export { ADMIN_MODELS_GOOGLE_SCRIPT, ADMIN_MODELS_OPENAI_SCRIPT, ADMIN_MODELS_ANTHROPIC_SCRIPT };

/** 注入管理页 `<script>`，与平台一一对应 */
export const ADMIN_MODELS_SCRIPTS_BUNDLE = [
  ADMIN_MODELS_GOOGLE_SCRIPT,
  ADMIN_MODELS_OPENAI_SCRIPT,
  ADMIN_MODELS_ANTHROPIC_SCRIPT,
].join("\n\n");
