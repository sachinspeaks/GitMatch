import "express";
import type { IUser } from "../../models/userModel.ts";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export {};
