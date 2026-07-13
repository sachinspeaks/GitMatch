import { model, Schema, Types } from "mongoose";

export enum Status {
  Accepted = "accepted",
  Rejected = "rejected",
  Interested = "interested",
  Ignore = "ignore",
}

export interface IConnectionRequest {
  fromUserId: Types.ObjectId;
  toUserId: Types.ObjectId;
  status: Status;
}
const connectionRequestSchema: Schema<IConnectionRequest> =
  new Schema<IConnectionRequest>(
    {
      fromUserId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "User",
      },
      toUserId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "User",
      },
      status: {
        type: String,
        required: true,
        enum: {
          values: Object.values(Status),
          message: "{VALUE} is not supported.",
        },
        default: Status.Interested,
      },
    },
    { timestamps: true },
  );

// connectionRequestSchema.pre("save", function () {
//   const connectionRequest = this;
//   if (connectionRequest.fromUserId.equals(connectionRequest.toUserId))
//     throw new Error("Self request not allowed.");
// });

connectionRequestSchema.index({
  fromUserId: 1,
  toUserId: 1,
});

export const ConnectionRequestModel = model<IConnectionRequest>(
  "ConnectionRequest",
  connectionRequestSchema,
);
