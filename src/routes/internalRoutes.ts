import { Router } from "express";
import { internalApiKeyMiddleware } from "../middlewares/internalApiKeyMiddleware";
import { clientAuthController } from "../controllers/internalAuthController";

const router = Router();

// Aplica o middleware de API key em TODAS as rotas deste router.
// Qualquer rota /internal/* exigirá o header X-Internal-API-Key válido.
router.use(internalApiKeyMiddleware);

// POST /internal/client-auth
// Chamado pelo Auth Service para validar credenciais de cliente.
router.post("/client-auth", clientAuthController);

export default router;