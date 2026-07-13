import type { Request } from "express";
import validator from "validator";
import bcrypt from "bcrypt";

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

export const validateEditProfileData = (req: Request) => {
  const allowedEditFields = [
    "firstName",
    "lastName",
    "age",
    "gender",
    "photoURL",
    "about",
    "skills",
  ];
  let isEditAllowed = Object.keys(req.body).every((editField) =>
    allowedEditFields.includes(editField),
  );
  if ("about" in req.body) {
    if (req.body.about.length > 200) isEditAllowed = false;
  }
  if ("photoURL" in req.body) {
    if (!validator.isURL(req.body.photoURL)) isEditAllowed = false;
  }
  return isEditAllowed;
};

export const validateCurrentPassword = async (req: Request) => {
  try {
    const { currentPassword } = req.body;
    if (!currentPassword) throw new Error("Current password is required.");
    const user = req.user;
    if (!user) throw new Error("Invalid User.");

    let isPasswordValid = false;
    const res = await bcrypt.compare(currentPassword, user?.password);
    isPasswordValid = res === true;
    return isPasswordValid;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const validateNewPassword = (
  oldPassword: string,
  newPassword: string,
) => {
  let isNewPasswordValid = false;
  isNewPasswordValid = validator.isStrongPassword(newPassword);
  isNewPasswordValid = oldPassword !== newPassword;
  return isNewPasswordValid;
};
