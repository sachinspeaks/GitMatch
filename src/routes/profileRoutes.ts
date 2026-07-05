import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const profileRouter = express.Router();

profileRouter.get("/profile", authMiddleware, async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (err: any) {
    console.log(err.message);
    res.status(500).send("Error : " + err.message);
  }
});

export default profileRouter;
