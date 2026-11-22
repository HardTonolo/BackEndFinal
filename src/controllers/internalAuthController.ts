
import { Request, Response } from "express";
import {
  InternalAuthService,
  InternalAuthError,
} from "../services/internalAuthService";
import { logger } from "../utils/logger";

const internalAuthService = new InternalAuthService();

/**
 * POST /internal/client-auth
 *
 * Endpoint interno utilizado pelo Auth Service
 * para validar as credenciais de clientes.
 *
 * Não emite JWT. Essa responsabilidade pertence
 * exclusivamente ao microserviço Auth.
 */
export const clientAuthController = async (
  req: Request,
  res: Response
) => {
  try {
    const { email, senha } = req.body;

    if (
      typeof email !== "string" ||
      typeof senha !== "string" ||
      !email.trim() ||
      !senha
    ) {
      return res.status(400).json({
        error: "Email e senha são obrigatórios",
        code: "MISSING_FIELDS",
      });
    }

    const cliente = await internalAuthService.validateClient(
      email,
      senha
    );

    return res.status(200).json(cliente);
  } catch (error: unknown) {
    if (error instanceof InternalAuthError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }

    logger.error("Erro inesperado em /internal/client-auth:", error);

    return res.status(500).json({
      error: "Erro interno do servidor",
      code: "INTERNAL_ERROR",
    });
  }
};
