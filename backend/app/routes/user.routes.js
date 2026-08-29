import { Router } from "express";
import users from "../controllers/user.controller.js";
import { authenticate } from "../authorization/authorization.js";

const router = Router();

router.get("/:id", [authenticate], users.findOne);
router.put("/:id", [authenticate], users.update);

export default router;
