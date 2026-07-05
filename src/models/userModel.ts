import { Schema, Document, model } from "mongoose";
import validator from "validator";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  age: number;
  gender?: string;
  photoURL?: string;
  about?: string;
  skills?: string[];
  getJWTToken(): string;
  isPasswordValid(sentPassword: string): Promise<boolean>;
}

const userSchema: Schema<IUser> = new Schema<IUser>(
  {
    firstName: { type: String, required: true, maxlength: 25 },
    lastName: { type: String },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate(value: string) {
        if (!validator.isEmail(value)) throw new Error("Invalid email id.");
      },
    },
    password: {
      type: String,
      required: true,
      validate(value: string) {
        if (!validator.isStrongPassword(value))
          throw new Error("Please enter a strong password.");
      },
    },
    age: { type: Number, min: 18 },
    gender: {
      type: String,
      validate(value: string) {
        if (!["male", "female", "others"].includes(value)) {
          throw new Error("Gender value is not valid.");
        }
      },
    },
    photoURL: {
      type: String,
      validate(value: string) {
        if (!validator.isURL(value))
          throw new Error("Profile picture not a valid url.");
      },
    },
    about: { type: String },
    skills: {
      type: [String],
      validate: {
        validator(value: string[]) {
          return value.length <= 10;
        },
        message: "At most 10 skills can be added.",
      },
    },
  },
  { timestamps: true },
);

userSchema.methods.getJWTToken = function (this: IUser) {
  const user = this;
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET as string);
  return token;
};

userSchema.methods.isPasswordValid = async function (
  this: IUser,
  sentPassword: string,
) {
  const user = this;
  const isValid = await bcrypt.compare(sentPassword, user.password);
  return isValid;
};

export const UserModel = model<IUser>("User", userSchema);
