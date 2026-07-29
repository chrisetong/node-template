import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  DEPLOYMENT_ID: Joi.string()
    .trim()
    .min(3)
    .max(64)
    .pattern(/^[a-z0-9][a-z0-9_-]*$/)
    .pattern(/^(?!.*(?:change|replace|example))/i)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['mysql'] })
    .required(),
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().pattern(
        /^(?!(?:replace|change|changeme|example|secret|password))/i,
      ),
    }),
  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[smh]$/i)
    .default('2h'),
  BCRYPT_COST: Joi.number().integer().min(10).max(14).default(12),
  PASSWORD_MIN_LENGTH: Joi.number().integer().min(10).max(72).default(12),
  LOGIN_FAIL_LIMIT: Joi.number().integer().min(3).max(20).default(5),
  LOGIN_LOCK_SECONDS: Joi.number().integer().min(60).max(86400).default(900),
  CAPTCHA_TTL_SECONDS: Joi.number().integer().min(60).max(900).default(300),
  AUDIT_RETENTION_DAYS: Joi.number().integer().min(30).max(3650).default(180),
  REDIS_HOST: Joi.string().default('127.0.0.1'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  PORT: Joi.number().port().default(3000),
  CORS_ORIGIN: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  TRUST_PROXY_HOPS: Joi.number().integer().min(0).max(5).default(0),
  SWAGGER_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
  API_BASE_URL: Joi.string().uri().optional(),
  ASSET_BASE_URL: Joi.string().uri().optional(),
  APP_TIME_ZONE: Joi.string().default('Asia/Shanghai'),
  DB_TIME_ZONE: Joi.string()
    .pattern(/^[+-](?:0\d|1[0-4]):[0-5]\d$/)
    .default('+08:00'),
  CACHE_NAMESPACE: Joi.string()
    .trim()
    .min(3)
    .max(128)
    .pattern(/^[a-z0-9][a-z0-9:_-]*$/)
    .pattern(/^(?!.*(?:change|replace|example))/i)
    .required(),
});
