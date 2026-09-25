/**
 * Lê e valida as variáveis de ambiente uma única vez.
 * Em produção, a falta de um segredo derruba o processo na partida em vez de
 * deixar o site no ar com um JWT assinável por qualquer um.
 */
function loadConfig(env = process.env) {
  const isProduction = env.NODE_ENV === 'production';

  const config = {
    isProduction,
    port: Number(env.PORT) || 8000,
    mongodbUri: env.MONGODB_URI || 'mongodb://localhost:27017/contopia',
    redisUrl: env.REDIS_URL || 'redis://localhost:6379',
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN || '15m',
    refreshTokenExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    frontendUrl: env.FRONTEND_URL || 'http://localhost:8089',
    uploadsDir: env.UPLOADS_DIR || '/data/uploads',
  };

  const errors = [];
  if (isProduction) {
    if (!config.jwtSecret || config.jwtSecret.length < 32) {
      errors.push('JWT_SECRET precisa ter pelo menos 32 caracteres em produção');
    }
    if (!env.MONGODB_URI) errors.push('MONGODB_URI é obrigatório em produção');
    if (!env.REDIS_URL) errors.push('REDIS_URL é obrigatório em produção');
  }
  if (errors.length > 0) {
    throw new Error(`Configuração inválida:\n- ${errors.join('\n- ')}`);
  }

  return config;
}

module.exports = { loadConfig };
