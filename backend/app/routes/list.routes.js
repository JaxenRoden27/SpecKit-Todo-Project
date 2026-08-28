import { Router } from "express";
import lists from "../controllers/list.controller.js";
import { authenticate } from "../authorization/authorization.js";

const router = Router();

router.get("/", [authenticate], lists.findAll);
router.post("/", [authenticate], lists.create);
router.put("/:listId", [authenticate], lists.update);
router.delete("/:listId", [authenticate], lists.delete);

export default router;
