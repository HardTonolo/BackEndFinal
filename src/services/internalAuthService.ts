import bcrypt from "bcryptjs";
import prisma from "../prisma/prismaClient";
import { logger } from "../utils/logger";

/**
 * Erro tipado pra endpoint interno.
 * Carrega statusCode + code pra o controller responder corretamente.
 */
export class InternalAuthError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = "InternalAuthError";
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, InternalAuthError.prototype);
  }
}

export interface ClientAuthResult {
  id: number;
  email: string;
  nome: string | null;
  permissao: string;
  ativo: boolean;
}

/**
 * Service que valida credenciais de CLIENTE no banco principal.
 *
 * Usado APENAS pelo Auth Service via endpoint interno /internal/client-auth.
 * O Auth Service é o único que emite JWT; aqui apenas validamos credenciais
 * e devolvemos os dados (SEM senha).
 */
export class InternalAuthService {
  async validateClient(email: string, senha: string): Promise<ClientAuthResult> {
    const cliente = await prisma.clientes.findFirst({
      where: {
        email,
        deletado_em: null,
      },
    });

    if (!cliente) {
      // Do ponto de vista do cliente, "não existe" e "senha errada"
      // são a mesma coisa — não vazamos se o email existe.
      throw new InternalAuthError(
        "Email ou senha inválidos",
        401,
        "INVALID_CREDENTIALS"
      );
    }

    if (cliente.ativo !== true) {
      throw new InternalAuthError(
        "Usuário desativado. Contate o administrador.",
        403,
        "USER_DISABLED"
      );
    }

    if (!cliente.senha) {
      logger.warn(
        `Cliente ${cliente.id} sem senha cadastrada tentou autenticar`
      );
      throw new InternalAuthError(
        "Usuário sem senha cadastrada",
        400,
        "NO_PASSWORD"
      );
    }

    const senhaValida = await bcrypt.compare(senha, cliente.senha);

    if (!senhaValida) {
      throw new InternalAuthError(
        "Email ou senha inválidos",
        401,
        "INVALID_CREDENTIALS"
      );
    }

    return {
      id: cliente.id,
      email: cliente.email ?? "",
      nome: cliente.nome,
      permissao: cliente.permissao ?? "CLIENTE",
      ativo: cliente.ativo,
    };
  }
}