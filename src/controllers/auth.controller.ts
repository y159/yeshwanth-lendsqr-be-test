import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { isUserBlacklisted } from "../services/karma.service";
import database from "../config/database";

export const registerUser = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { first_name, last_name, email, phone, bvn, password } =
      req.body;

    if (
      !first_name ||
      !last_name ||
      !email ||
      !phone ||
      !bvn ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const blacklistedByEmail = await isUserBlacklisted(email);
    const blacklistedByBvn = await isUserBlacklisted(bvn);
    if (blacklistedByEmail || blacklistedByBvn) {
        return res.status(403).json({
            success: false,
            message: "User is blacklisted and cannot be onboarded",
        });
    }

    const existingUser = await database("users")
      .where({ email })
      .first();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = uuidv4();
    const walletId = uuidv4();

    await database.transaction(async (trx) => {
      await trx("users").insert({
        id: userId,
        first_name,
        last_name,
        email,
        phone,
        bvn,
        password: hashedPassword,
      });

      await trx("wallets").insert({
        id: walletId,
        user_id: userId,
        balance: 0,
        currency: "NGN",
      });
    });

    const token = jwt.sign(
      { userId, email },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        userId,
        walletId,
        token,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};