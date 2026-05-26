import { Response } from "express";
import { v4 as uuidv4 } from "uuid";

import database from "../config/database";
import { AuthRequest } from "../middlewares/auth.middleware";

export const fundWallet = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { amount } = req.body;
    const userId = req.user?.userId;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be greater than zero" });
    }

    const wallet = await database("wallets").where({ user_id: userId }).first();

    if (!wallet) {
      return res.status(404).json({ success: false, message: "Wallet not found" });
    }

    const reference = uuidv4();

    await database.transaction(async (trx) => {
      await trx("wallets")
        .where({ id: wallet.id })
        .increment("balance", Number(amount));

      await trx("transactions").insert({
        id: uuidv4(),
        wallet_id: wallet.id,
        type: "FUND",
        amount,
        status: "SUCCESS",
        reference,
        receiver_wallet_id: wallet.id,
      });
    });

    return res.status(200).json({
      success: true,
      message: "Wallet funded successfully",
      data: { reference },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getWalletBalance = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;

    const wallet = await database("wallets").where({ user_id: userId }).first();

    if (!wallet) {
      return res.status(404).json({ success: false, message: "Wallet not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Wallet balance fetched successfully",
      data: {
        walletId: wallet.id,
        balance: wallet.balance,
        currency: wallet.currency,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const transferFunds = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const { receiver_email, amount } = req.body;
    const userId = req.user?.userId;

    if (!receiver_email || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Receiver email and valid amount are required",
      });
    }

    const senderWallet = await database("wallets")
      .where({ user_id: userId })
      .first();

    if (!senderWallet) {
      return res.status(404).json({
        success: false,
        message: "Sender wallet not found",
      });
    }

    const receiver = await database("users")
      .where({ email: receiver_email })
      .first();

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
      });
    }

    if (receiver.id === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot transfer funds to yourself",
      });
    }

    const receiverWallet = await database("wallets")
      .where({ user_id: receiver.id })
      .first();

    if (!receiverWallet) {
      return res.status(404).json({
        success: false,
        message: "Receiver wallet not found",
      });
    }

    if (Number(senderWallet.balance) < Number(amount)) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
      });
    }

    const reference = uuidv4();

    await database.transaction(async (trx) => {
      await trx("wallets")
        .where({ id: senderWallet.id })
        .decrement("balance", Number(amount));

      await trx("wallets")
        .where({ id: receiverWallet.id })
        .increment("balance", Number(amount));

      await trx("transactions").insert({
        id: uuidv4(),
        wallet_id: senderWallet.id,
        type: "TRANSFER",
        amount,
        status: "SUCCESS",
        reference,
        sender_wallet_id: senderWallet.id,
        receiver_wallet_id: receiverWallet.id,
      });
    });

    return res.status(200).json({
      success: true,
      message: "Funds transferred successfully",
      data: { reference },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const withdrawFunds = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const { amount } = req.body;
    const userId = req.user?.userId;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than zero",
      });
    }

    const wallet = await database("wallets")
      .where({ user_id: userId })
      .first();

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    if (Number(wallet.balance) < Number(amount)) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
      });
    }

    const reference = uuidv4();

    await database.transaction(async (trx) => {
      await trx("wallets")
        .where({ id: wallet.id })
        .decrement("balance", Number(amount));

      await trx("transactions").insert({
        id: uuidv4(),
        wallet_id: wallet.id,
        type: "WITHDRAW",
        amount,
        status: "SUCCESS",
        reference,
        sender_wallet_id: wallet.id,
      });
    });

    return res.status(200).json({
      success: true,
      message: "Withdrawal successful",
      data: { reference },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getTransactions = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    const wallet = await database("wallets")
      .where({ user_id: userId })
      .first();

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    const transactions = await database("transactions")
      .where({ wallet_id: wallet.id })
      .orderBy("created_at", "desc");

    return res.status(200).json({
      success: true,
      message: "Transactions fetched successfully",
      data: transactions,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};