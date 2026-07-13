import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { ConnectionRequestModel, Status } from "../models/connectionRequest.js";
import { UserModel } from "../models/userModel.js";
const connectionRequestRouter = express.Router();
import validator from "validator";

//we should only give interested and ingored option for a connection request, accepted and rejected should be given only to the user who received the request

connectionRequestRouter.post(
  "/request/send/:status/:toUserId",
  authMiddleware,
  async (req, res) => {
    try {
      const fromUserId = req.user?._id;
      const toUserId = req.params.toUserId;
      const status = req.params.status;
      if (
        !fromUserId ||
        !toUserId ||
        Array.isArray(toUserId) ||
        fromUserId.equals(toUserId) ||
        !status ||
        Array.isArray(status)
      )
        throw new Error("Invalid params for connection request.");
      if (
        status.toLowerCase() !== "interested" &&
        status.toLocaleLowerCase() !== "ignore"
      )
        throw new Error("Invalid status for connection request.");
      if (!validator.isMongoId(toUserId))
        return res.status(404).json({ message: "Invalid userid." });
      const toUser = await UserModel.findById(toUserId);
      if (!toUser) return res.status(404).json({ message: "User not found." });

      const existingReq = await ConnectionRequestModel.findOne({
        $or: [
          { fromUserId, toUserId },
          { fromUserId: toUserId, toUserId: fromUserId },
        ],
      });

      if (existingReq) throw new Error("Connection req already sent.");

      const conReq = new ConnectionRequestModel({
        fromUserId,
        toUserId,
        status,
      });

      const data = await conReq.save();
      res.json({ message: "Connection request sent successfully", data });
    } catch (error: any) {
      res.status(400).send("Error : " + error.message);
    }
  },
);

connectionRequestRouter.post(
  "/request/review/:status/:requestId",
  authMiddleware,
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      const status = req.params.status;
      const requestId = req.params.requestId;
      const allowedStatus = [Status.Rejected, Status.Accepted];
      if (
        !status ||
        Array.isArray(status) ||
        !allowedStatus.includes(status as Status)
      )
        throw new Error("Invalid request status type.");

      if (!requestId || Array.isArray(requestId) || !loggedInUser)
        throw new Error("Invalid requestId or user not matched.");

      const connectionRequest = await ConnectionRequestModel.findOne({
        _id: requestId,
        toUserId: loggedInUser._id,
        status: Status.Interested,
      });
      if (!connectionRequest) throw new Error("Connection request not found.");
      connectionRequest.status = status as Status;
      const data = await connectionRequest.save();
      res.json({ message: "Connection request " + status, data });
    } catch (error: any) {
      console.log(error);
      res.status(401).json({ error: error.message });
    }
  },
);

export default connectionRequestRouter;
