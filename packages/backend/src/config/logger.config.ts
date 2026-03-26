import { createLogger, format, transports, Logger } from 'winston';

const SENSITIVE_FIELDS = [
  'password',
  'password_hash',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'access_token',
  'refresh_token',
  'authorization',
  'Authorization',
  'encryption_iv',
  'encryptionIv',
  'secret',
  'apiKey',
  'api_key',
  'cookie',
  'VAULT_ENCRYPTION_KEY',
  'JWT_PRIVATE_KEY',
  'BCRYPT_PEPPER',
];

function redactSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...obj };
  for (const field of SENSITIVE_FIELDS) {
    if (field in redacted) {
      redacted[field] = '[REDACTED]';
    }
  }
  return redacted;
}

const sensitiveFieldsFormat = format((info) => {
  return redactSensitiveFields(info as Record<string, unknown>) as typeof info;
});

export function createWinstonLogger(): Logger {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const logLevel = process.env.LOG_LEVEL ?? (nodeEnv === 'production' ? 'info' : 'debug');

  const loggerTransports = [
    new transports.Console({
      format:
        nodeEnv === 'production'
          ? format.combine(sensitiveFieldsFormat(), format.timestamp(), format.json())
          : format.combine(
              sensitiveFieldsFormat(),
              format.timestamp({ format: 'HH:mm:ss' }),
              format.colorize(),
              format.printf(({ timestamp, level, message, context, ...rest }) => {
                const ctx = context ? `[${context}]` : '';
                const meta = Object.keys(rest).length ? JSON.stringify(rest) : '';
                return `${timestamp} ${level} ${ctx} ${message} ${meta}`;
              }),
            ),
    }),
  ];

  if (nodeEnv === 'production') {
    loggerTransports.push(
      new transports.File({
        filename: 'logs/app.log',
        format: format.combine(sensitiveFieldsFormat(), format.timestamp(), format.json()),
        maxsize: 50 * 1024 * 1024, // 50MB
        maxFiles: 10,
      }) as never,
    );
  }

  return createLogger({
    level: logLevel,
    transports: loggerTransports,
    exitOnError: false,
  });
}
