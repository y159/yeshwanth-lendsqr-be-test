import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import {
  fundWallet,
  getWalletBalance,
  transferFunds,
  withdrawFunds,
  getTransactions,
} from "../controllers/wallet.controller";

const router = Router();

router.post("/fund", authenticate, fundWallet);
router.get("/balance", authenticate, getWalletBalance);
router.post("/transfer", authenticate, transferFunds);
router.post("/withdraw", authenticate, withdrawFunds);
router.get("/transactions", authenticate, getTransactions);

export default router;