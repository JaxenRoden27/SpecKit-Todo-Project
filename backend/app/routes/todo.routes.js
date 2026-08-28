import { Router } from "express";
import todos from "../controllers/todo.controller.js";
import { authenticate } from "../authorization/authorization.js";

const router = Router();

router.put("/:id", [authenticate], todos.update);
router.delete("/:id", [authenticate], todos.delete);

export default router;
