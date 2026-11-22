import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

/**
 * Middleware que valida o header `X-Internal-API-Key` em chamadas
 * de serviço-a-serviço (ex: Auth Service chamando /internal/client-auth).
 *
 * É a "senha" compartilhada entre serviços. Só quem tem a chave
 * configurada no .env pode chamar os endpoints internos.
 *
 * Deve ser usado APENAS em rotas /internal/*, nunca em rotas públicas.
 */
export const internalApiKeyMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) {
    logger.error("ERRO CRÍTICO: INTERNAL_API_KEY não configurada no backend.");
    return res.status(500).json({
      error: "Erro interno de configuração do servidor",
      code: "CONFIG_ERROR",
    });
  }

  const receivedKey = req.headers["x-internal-api-key"];

  if (!receivedKey || typeof receivedKey !== "string") {
    logger.warn(
      `Chamada interna sem API key: ${req.method} ${req.originalUrl} ip=${req.ip}`
    );
    return res.status(401).json({
      error: "API key ausente",
      code: "MISSING_API_KEY",
    });
  }

  if (receivedKey !== expectedKey) {
    logger.warn(
      `Chamada interna com API key inválida: ${req.method} ${req.originalUrl} ip=${req.ip}`
    );
    return res.status(403).json({
      error: "API key inválida",
      code: "INVALID_API_KEY",
    });
  }

  next();
};