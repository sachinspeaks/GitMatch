import express, { type Request, type Response } from "express";
import validator from "validator";
import { UserModel } from "../models/userModel.js";
import { validateSignUpData } from "../utils/validation.js";
import bcrypt from "bcrypt";

const authRouter = express.Router();

authRouter.post("/signup", async (req: Request, res: Response) => {
  try {
    validateSignUpData(req);
    const { password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const User = new UserModel({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: hash,
    });
    await User.save();
    res.send("user saved successfully.");
  } catch (err: any) {
    console.log(err.message);
    res.status(500).send("Error : " + err.message);
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!validator.isEmail(email)) throw new Error("Email address not valid.");

    const user = await UserModel.findOne({ email: email });
    if (!user) throw new Error("Invalid Credentials.");

    const isPasswordValid = await user.isPasswordValid(password);

    if (isPasswordValid) {
      const token = user.getJWTToken();
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
      return res.json({ message: "user logged in successfully" });
    } else throw new Error("Invalid Credentials.");
  } catch (err: any) {
    console.log(err.message);
    res.status(500).send("Error : " + err.message);
  }
});

export default authRouter;
