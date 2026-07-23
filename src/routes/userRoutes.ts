import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { ConnectionRequestModel, Status } from "../models/connectionRequest.js";
import { UserModel } from "../models/userModel.js";
const userRouter = express.Router();

const safeDataString = "firstName lastName photoURL age gender about skills";

userRouter.get("/user/requests/received", authMiddleware, async (req, res) => {
  try {
    const loggedInUser = req.user;
    if (!loggedInUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const connectionRequests = await ConnectionRequestModel.find({
      toUserId: loggedInUser?._id,
      status: Status.Interested,
    }).populate("fromUserId", safeDataString);
    res.json({
      message: `You've got ${connectionRequests.length} connection request(s).`,
      connectionRequests,
    });
  } catch (error: any) {
    res.status(501).json({ error: error.message });
  }
});

userRouter.get("/user/connections", authMiddleware, async (req, res) => {
  try {
    const loggedInUser = req.user;
    if (!loggedInUser) return res.status(401).json({ message: "Unauthorized" });
    const connectionRequests = await ConnectionRequestModel.find({
      $and: [
        {
          $or: [
            { toUserId: loggedInUser._id },
            { fromUserId: loggedInUser._id },
          ],
        },
        { status: Status.Accepted },
      ],
    })
      .populate("fromUserId", safeDataString)
      .populate("toUserId", safeDataString);
    const connections = connectionRequests.map((connectionRequest) => {
      if (connectionRequest.fromUserId.equals(loggedInUser._id))
        return connectionRequest.toUserId;
      else return connectionRequest.fromUserId;
    });
    res.send(connections);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

userRouter.get("/feed", authMiddleware, async (req, res) => {
  try {
    const loggedInUser = req.user;
    if (!loggedInUser) throw new Error("Invalid user");

    let pageNumber = Number(req.query.page || 1);
    let limit = Number(req.query.limit || 10);

    limit = Math.min(limit, 50); // Limit the maximum number of users per page to 100

    const skipCount = (pageNumber - 1) * limit;

    const connectionRequests = await ConnectionRequestModel.find({
      $or: [{ fromUserId: loggedInUser?._id }, { toUserId: loggedInUser?._id }],
    }).select("fromUserId toUserId");

    const hiddenUsers = new Set<string>();

    connectionRequests.forEach((connectionRequest) => {
      hiddenUsers.add(connectionRequest.fromUserId.toString());
      hiddenUsers.add(connectionRequest.toUserId.toString());
    });

    const users = await UserModel.find({
      $and: [
        { _id: { $nin: Array.from(hiddenUsers) } },
        { _id: { $ne: loggedInUser._id } },
      ],
      ...(loggedInUser.gender ? { gender: { $ne: loggedInUser.gender } } : {}),
    })
      .select(safeDataString)
      .sort({ _id: 1 })
      .skip(skipCount)
      .limit(limit);

    res.send(users);
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Something went wrong." });
  }
});

userRouter.get("/allusers", async (req, res) => {
  try {
    const allUsers = await UserModel.find({});
    return res.json(allUsers);
  } catch (error: any) {
    return res
      .status(400)
      .json({ message: error.message || "Something went wrong" });
  }
});

export default userRouter;
