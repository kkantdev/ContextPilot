import { z } from 'zod';
export declare const PROTOCOL_VERSION = "1.0";
export type RiskLevel = 'SAFE' | 'REVIEW' | 'DANGEROUS' | 'BLOCKED';
export type OperationState = 'queued' | 'planning' | 'awaiting_approval' | 'approved' | 'running' | 'testing' | 'completed' | 'failed' | 'cancelled';
export type CommandStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled' | 'unavailable' | 'blocked' | 'approval_required';
export interface CommandResult {
    action: string;
    operationId?: string;
    tool?: string;
    status: CommandStatus;
    exitCode: number | null;
    stdout: string;
    stderr: string;
    durationMs: number;
    startedAt: string;
    completedAt: string;
    error?: string;
}
export type ErrorCode = 'PAIRING_TOKEN_EXPIRED' | 'INVALID_SESSION' | 'PROTOCOL_VERSION_UNSUPPORTED' | 'WORKSPACE_ACCESS_DENIED' | 'PATH_OUTSIDE_WORKSPACE' | 'COMMAND_NOT_ALLOWED' | 'COMMAND_FAILED' | 'COMMAND_UNAVAILABLE' | 'COMMAND_BLOCKED' | 'ACTION_NOT_FOUND' | 'AI_UNAVAILABLE' | 'MODEL_TIMEOUT' | 'TOOL_VALIDATION_FAILED' | 'TEST_FAILED' | 'INTERNAL_ERROR';
export interface QRPayload {
    protocolVersion: string;
    agentId: string;
    host: string;
    port: number;
    pairingToken: string;
    projectName: string;
    projectId: string;
    expiresAt: string;
}
export interface ProjectInfo {
    id: string;
    name: string;
    rootPath: string;
    language: string;
    framework: string;
    packageManager: string;
    isGitRepo: boolean;
    testFramework?: string;
    branch?: string;
    totalFiles?: number;
}
export interface ToolDefinition {
    name: string;
    description: string;
    riskLevel: RiskLevel;
    inputSchema: Record<string, any>;
}
export interface PlanStep {
    stepId: string;
    description: string;
    tool: string;
    args: Record<string, any>;
    riskLevel: RiskLevel;
    requiresApproval: boolean;
}
export interface Plan {
    planId: string;
    summary: string;
    steps: PlanStep[];
}
export interface ApprovalRequest {
    approvalId: string;
    operationId: string;
    stepId: string;
    tool: string;
    args: Record<string, any>;
    riskLevel: RiskLevel;
    description: string;
}
export interface ToolResult {
    tool: string;
    success: boolean;
    output: any;
    error?: string;
    durationMs: number;
}
export interface TestResult {
    command: string;
    success: boolean;
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    durationMs: number;
    summary: string;
    failures?: Array<{
        name: string;
        message: string;
        stack?: string;
    }>;
}
export interface GitResult {
    branch: string;
    isClean: boolean;
    modifiedFiles: string[];
    untrackedFiles: string[];
    diffSummary?: string;
}
export interface SecurityFinding {
    id: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    title: string;
    description: string;
    affectedFile?: string;
    recommendation: string;
}
export interface SecurityResult {
    scanner: string;
    findings: SecurityFinding[];
    summary: string;
}
export interface ProtocolMessage<T = any> {
    protocolVersion: string;
    messageId: string;
    type: string;
    timestamp: string;
    sessionId?: string;
    operationId?: string;
    payload: T;
}
export declare const PairingRequestSchema: z.ZodObject<{
    pairingToken: z.ZodString;
    deviceId: z.ZodString;
    deviceName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    pairingToken: string;
    deviceId: string;
    deviceName?: string | undefined;
}, {
    pairingToken: string;
    deviceId: string;
    deviceName?: string | undefined;
}>;
export declare const UserRequestSchema: z.ZodObject<{
    prompt: z.ZodString;
    operationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    operationId?: string | undefined;
}, {
    prompt: string;
    operationId?: string | undefined;
}>;
export declare const ApprovalResponseSchema: z.ZodObject<{
    approvalId: z.ZodString;
    approved: z.ZodBoolean;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    approved: boolean;
    approvalId: string;
    reason?: string | undefined;
}, {
    approved: boolean;
    approvalId: string;
    reason?: string | undefined;
}>;
export declare const ActionRequestSchema: z.ZodObject<{
    action: z.ZodString;
    args: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    action: string;
    args?: Record<string, any> | undefined;
}, {
    action: string;
    args?: Record<string, any> | undefined;
}>;
//# sourceMappingURL=protocol.d.ts.map