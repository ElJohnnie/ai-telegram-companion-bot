import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  TELEGRAM_BOT_TOKEN: Joi.string().required(),

  // LLM selection (provider-agnostic). The active provider's key must be set.
  LLM_PROVIDER: Joi.string().default('huggingface'),
  LLM_FALLBACK_PROVIDER: Joi.string().allow('').optional(),

  // Optional key: allow empty so a present-but-blank line in .env is treated as
  // "not configured" (matches the adapter's isConfigured() check).
  ANTHROPIC_API_KEY: Joi.string().allow('').optional(),
  HUGGINGFACE_API_KEY: Joi.string().required(),
  HF_MODEL: Joi.string().default('meta-llama/Llama-3.2-3B-Instruct'),

  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
});
