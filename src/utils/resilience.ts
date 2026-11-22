import CircuitBreaker from 'opossum';
import { logger } from './logger';

// Configuração do Circuit Breaker
const breakerOptions = {
  timeout: 5000,                    // se a operação passar de 5s, aborta
  errorThresholdPercentage: 50,     // 50% de falhas → abre o circuito
  resetTimeout: 30000,              // tenta fechar após 30s
  volumeThreshold: 10,              // só considera abrir depois de 10 chamadas na janela
};

// 🔑 CORREÇÃO PRINCIPAL:
// O breaker agora é guardado por nome de operação (Singleton).
// Antes, era criado dentro da função e cada chamada tinha um breaker novo,
// o que zerava o estado a cada request e tornava o Circuit Breaker inútil.
const breakers = new Map<string, CircuitBreaker>();

function getBreaker<T>(
  operation: () => Promise<T>,
  operationName: string
): CircuitBreaker {
  let breaker = breakers.get(operationName);

  if (!breaker) {
    breaker = new CircuitBreaker(operation, breakerOptions);

    breaker.on('open', () =>
      logger.error(`🔴 Circuit Breaker ABERTO para: ${operationName}`)
    );
    breaker.on('halfOpen', () =>
      logger.warn(`🟡 Circuit Breaker MEIO-ABERTO para: ${operationName}`)
    );
    breaker.on('close', () =>
      logger.info(`🟢 Circuit Breaker FECHADO para: ${operationName}`)
    );

    breakers.set(operationName, breaker);
  } else {
    // Se o breaker já existe, a operação pode ter mudado (ex: closure nova).
    // Atualizamos a função executada para refletir o novo contexto.
    // O estado (open/halfOpen/closed) é preservado.
    (breaker as any).action = operation;
  }

  return breaker;
}

// Função utilitária de Resiliência (Retry + Timeout + Circuit Breaker)
export async function executeWithResilience<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 3
): Promise<T> {
  const breaker = getBreaker(operation, operationName);

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return (await breaker.fire()) as T;
    } catch (error) {
      lastError = error;
      logger.warn(
        `Tentativa ${attempt}/${maxRetries} falhou para ${operationName}. Erro: ${error}`
      );

      if (attempt < maxRetries) {
        // Backoff exponencial: 1s, 2s, 4s...
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // 🔑 Preserva o erro original em `cause` (não perde stack/tipo/código)
  const finalError = new Error(
    `Operação '${operationName}' falhou após ${maxRetries} tentativas.`
  );
  (finalError as any).cause = lastError;
  throw finalError;
}

// (Opcional, útil em testes e no shutdown do servidor)
export function shutdownResilience(): void {
  for (const breaker of breakers.values()) {
    breaker.shutdown();
  }
  breakers.clear();
}