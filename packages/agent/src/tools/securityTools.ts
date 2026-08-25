import fs from 'fs';
import path from 'path';
import { WorkspaceManager } from '../workspace/manager';
import { ToolResult, SecurityFinding, SecurityResult } from '../types/protocol';

export function registerSecurityTools(workspace: WorkspaceManager) {
  return {
    security_scan: async (): Promise<ToolResult> => {
      const startTime = Date.now();
      const findings: SecurityFinding[] = [];
      const root = workspace.getWorkspaceRoot();

      const ignoreSet = new Set(['node_modules', '.git', 'dist', 'build', '.dart_tool', 'coverage']);

      // 1. Scan files for potential hardcoded secrets/keys
      const secretPatterns = [
        { name: 'Hardcoded AWS Key', regex: /AKIA[0-9A-Z]{16}/g, severity: 'HIGH' as const },
        { name: 'Hardcoded Private Key', regex: /-----BEGIN PRIVATE KEY-----/g, severity: 'CRITICAL' as const },
        { name: 'Hardcoded Generic API Token', regex: /(api_key|secret_key|password)\s*=\s*['"][A-Za-z0-9_\-]{16,}['"]/gi, severity: 'MEDIUM' as const },
      ];

      const scanDirectory = (dir: string) => {
        if (findings.length >= 20) return;
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (ignoreSet.has(entry.name)) continue;
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
              scanDirectory(fullPath);
            } else if (entry.isFile()) {
              const relPath = path.relative(root, fullPath);

              // Check for sensitive files checked into repository
              if (entry.name === '.env' || entry.name.endsWith('.pem') || entry.name.endsWith('.key')) {
                findings.push({
                  id: `sec-${findings.length + 1}`,
                  severity: 'HIGH',
                  title: 'Sensitive Credential File in Repository',
                  description: `File "${relPath}" contains environment secrets or cryptographic keys.`,
                  affectedFile: relPath,
                  recommendation: 'Add sensitive key/env files to .gitignore to avoid committing secrets.',
                });
              }

              try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                for (const pattern of secretPatterns) {
                  if (pattern.regex.test(content)) {
                    findings.push({
                      id: `sec-${findings.length + 1}`,
                      severity: pattern.severity,
                      title: pattern.name,
                      description: `Potential secret pattern matched in file "${relPath}".`,
                      affectedFile: relPath,
                      recommendation: 'Move hardcoded keys to environment variables or local key managers.',
                    });
                  }
                }
              } catch {
                // Ignore binary read errors
              }
            }
          }
        } catch {
          // Ignore directory read errors
        }
      };

      scanDirectory(root);

      const securityResult: SecurityResult = {
        scanner: 'ContextPilot Security Scanner v1.0',
        findings,
        summary:
          findings.length === 0
            ? 'No critical security issues or exposed secrets detected in project.'
            : `Potential security issues detected: ${findings.length} findings.`,
      };

      return {
        tool: 'security_scan',
        success: true,
        output: securityResult,
        durationMs: Date.now() - startTime,
      };
    },
  };
}
