import { Router } from "express";
import lists from "../controllers/list.controller.js";
import { authenticate } from "../authorization/authorization.js";

const router = Router();

router.get("/", [authenticate], lists.findAll);

export default router;
