import type { NextFunction, Request, Response } from "express";
import { UserModel } from "../models/userModel.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const cookies = req.cookies;
    const { token } = cookies;

    if (!token) throw new Error("Invalid Token.");
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    const { _id } = decoded as { _id: string };
    const user = await UserModel.findById(_id);
    if (!user) throw new Error("Something went wrong.");
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
};
