import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  BOT_NAME: Joi.string().default('Ayla').required(),
  TELEGRAM_BOT_TOKEN: Joi.string().required(),

  // LLM selection (provider-agnostic). The active provider's key must be set.
  LLM_PROVIDER: Joi.string().default('huggingface'),
  LLM_FALLBACK_PROVIDER: Joi.string().allow('').optional(),

  // Optional key: allow empty so a present-but-blank line in .env is treated as
  // "not configured" (matches the adapter's isConfigured() check).
  ANTHROPIC_API_KEY: Joi.string().allow('').optional(),
  HUGGINGFACE_API_KEY: Joi.string().required(),
  HF_MODEL: Joi.string().default('Qwen/Qwen2.5-7B-Instruct'),

  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
});
