import express, { type Request, type Response } from "express";
import { UserModel } from "./models/userModel.js";
import { validateSignUpData } from "./utils/validation.js";
import validator from "validator";
import bcrypt from "bcrypt";

const app = express();

app.use(express.json());
// app.use(cors());

app.get("/user", async (req, res) => {
  try {
    const user = await UserModel.find({}).select("-password");
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

app.delete("/user", async (req, res) => {
  const id = req.body.id;
  try {
    const deletedUser = await UserModel.findByIdAndDelete(id);
    if (deletedUser)
      return res.json({
        message: "user deleted successfully",
        userName: deletedUser.firstName,
      });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!validator.isEmail(email)) throw new Error("Email address not valid.");

    const User = await UserModel.findOne({ email: email });
    if (!User) throw new Error("Invalid Credentials.");

    const isPasswordValid = await bcrypt.compare(password, User.password);
    if (isPasswordValid) return res.send("Login Successfull.");
    throw new Error("Invalid Credentials.");
  } catch (err: any) {
    console.log(err.message);
    res.status(500).send("Error : " + err.message);
  }
});

app.post("/signup", async (req: Request, res: Response) => {
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

const ALLOWED_UPDATES = [
  "photoURL",
  "about",
  "gender",
  "age",
  "skills",
  "photoURL",
];

app.patch("/user/:id", async (req: Request, res: Response) => {
  const isAllowedUpdate = Object.keys(req.body).every((valueToUpdate) => {
    console.log(valueToUpdate);
    return ALLOWED_UPDATES.includes(valueToUpdate);
  });
  try {
    if (!isAllowedUpdate)
      throw new Error("Update not allowed for given fields.");
    const id = req.params?.id;
    await UserModel.findByIdAndUpdate(id, req.body, { runValidators: true });
    return res.json({ message: "user updated successfully" });
  } catch (error: any) {
    return res.status(500).json({
      message: error.message ? error.message : "Internal Server Error",
    });
  }
});

app.get("/user", (req, res) => {
  throw new Error("db me jagah nahi");
  res.send("ok");
});

export default app;
