import type { Request } from "express";
import validator from "validator";

export const validateSignUpData = (req: Request) => {
  const { firstName, lastName, email, password } = req.body;
  if (!firstName || !lastName)
    throw new Error("First Name and Last Name is required.");

  if (!validator.isAlpha(firstName) || !validator.isAlpha(lastName))
    throw new Error("Special characters not allowed in name.");
  if (!validator.isEmail(email)) throw new Error("Email address not valid.");
  if (!validator.isStrongPassword(password))
    throw new Error("Please enter a strong password.");
};
