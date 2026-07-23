import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  validateCurrentPassword,
  validateEditProfileData,
  validateNewPassword,
} from "../utils/validation.js";
import bcrypt from "bcrypt";

const profileRouter = express.Router();

profileRouter.get("/profile/view", authMiddleware, async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (err: any) {
    console.log(err.message);
    res.status(500).send("Error : " + err.message);
  }
});

profileRouter.patch("/profile/edit", authMiddleware, async (req, res) => {
  try {
    const isEditAllowed = validateEditProfileData(req);
    if (!isEditAllowed) throw new Error("Edit request not valid.");
    const user = req.user;
    if (!user) throw new Error("User not found.");
    Object.keys(req.body).forEach((editItem) => {
      user.set(editItem, req.body[editItem]);
    });
    await user.save();
    res.json({ message: "Profile updated successfully", user });
  } catch (error: any) {
    console.log(error.message);
    res.status(400).send("Error : " + error.message);
  }
});

profileRouter.patch("/profile/update", authMiddleware, async (req, res) => {
  try {
    const isOldPasswordValid = await validateCurrentPassword(req);
    if (!isOldPasswordValid) throw new Error("Current password is not valid.");
    const { oldPassword, newPassword } = req.body;
    if (!newPassword) throw new Error("New password req");
    const isNewPasswordValid = validateNewPassword(oldPassword, newPassword);
    if (!isNewPasswordValid) throw new Error("New Password Invalid.");
    const hash = await bcrypt.hash(newPassword, 10);
    const user = req.user;
    if (!user) throw new Error("User not found.");
    await user.updateOne({ password: hash });
    res.send("Password updated successfully.");
  } catch (error: any) {
    console.log(error.message);
    res.status(400).send("Error : " + error.message);
  }
});
export default profileRouter;
