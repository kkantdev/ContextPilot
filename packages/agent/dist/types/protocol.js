"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CancelRequestSchema = exports.ActionRequestSchema = exports.ApprovalResponseSchema = exports.UserRequestSchema = exports.PairingRequestSchema = exports.PROTOCOL_VERSION = void 0;
const zod_1 = require("zod");
exports.PROTOCOL_VERSION = '1.0';
// Zod validation schemas for incoming messages from Phone
exports.PairingRequestSchema = zod_1.z.object({
    pairingToken: zod_1.z.string(),
    deviceId: zod_1.z.string(),
    deviceName: zod_1.z.string().optional(),
});
exports.UserRequestSchema = zod_1.z.object({
    prompt: zod_1.z.string().min(1),
    operationId: zod_1.z.string().optional(),
});
exports.ApprovalResponseSchema = zod_1.z.object({
    approvalId: zod_1.z.string(),
    approved: zod_1.z.boolean(),
    reason: zod_1.z.string().optional(),
});
exports.ActionRequestSchema = zod_1.z.object({
    action: zod_1.z.string().min(1),
    args: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    requestId: zod_1.z.string().optional(),
});
exports.CancelRequestSchema = zod_1.z.object({
    requestId: zod_1.z.string().min(1),
});
//# sourceMappingURL=protocol.js.map