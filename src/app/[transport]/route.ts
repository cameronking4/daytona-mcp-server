import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import axios from "axios";

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// Daytona API client
const daytonaClient = axios.create({
  baseURL: "https://api.daytona.io",
  headers: {
    "Authorization": `Bearer ${process.env.DAYTONA_API_KEY}`,
    "Content-Type": "application/json",
  },
});

// Error handling utility
const handleApiError = (error: any, defaultMessage = "API request failed") => {
  console.error("Daytona API error:", error);
  
  let errorMessage = defaultMessage;
  if (error.response) {
    errorMessage = `${defaultMessage}: ${error.response.status} - ${error.response.data?.message || JSON.stringify(error.response.data)}`;
  } else if (error.request) {
    errorMessage = `${defaultMessage}: No response received`;
  } else {
    errorMessage = `${defaultMessage}: ${error.message}`;
  }
  
  return {
    content: [
      {
        type: "text" as const,
        text: `## Error\n\n${errorMessage}`
      }
    ]
  };
};

// Format response utility
const formatResponse = (title: string, data: any) => {
  return {
    content: [
      {
        type: "text" as const,
        text: `## ${title}\n\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`
      }
    ]
  };
};

const handler = createMcpHandler(
  (server) => {
    // ==================== SANDBOX MANAGEMENT TOOLS ====================
    
    server.tool(
      "listSandboxes",
      "List all sandboxes with optional filtering by labels",
      {
        verbose: z.boolean({
          description: "Include verbose output"
        }).optional(),
        labels: z.string({
          description: "JSON encoded labels to filter by, e.g. {\"label1\": \"value1\", \"label2\": \"value2\"}"
        }).optional(),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ verbose, labels, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          const params: Record<string, any> = { verbose: verbose || false };
          if (labels) params.labels = labels;
          
          const response = await daytonaClient.get('/sandbox', { 
            params,
            headers
          });
          
          return formatResponse("Sandboxes", response.data);
        } catch (error) {
          return handleApiError(error, "Failed to list sandboxes");
        }
      }
    );

    server.tool(
      "getSandbox",
      "Get detailed information about a specific sandbox",
      {
        sandboxId: z.string({
          description: "ID of the sandbox"
        }),
        verbose: z.boolean({
          description: "Include verbose output"
        }).optional(),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ sandboxId, verbose, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          const params: Record<string, any> = { verbose: verbose || false };
          
          const response = await daytonaClient.get(`/sandbox/${sandboxId}`, { 
            params,
            headers
          });
          
          return formatResponse(`Sandbox: ${sandboxId}`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to get sandbox ${sandboxId}`);
        }
      }
    );

    server.tool(
      "createSandbox",
      "Create a new sandbox with customizable parameters",
      {
        snapshot: z.string({
          description: "The ID or name of the snapshot used for the sandbox"
        }),
        user: z.string({
          description: "The user associated with the project"
        }).optional(),
        env: z.record(z.string(), {
          description: "Environment variables for the sandbox"
        }).optional(),
        labels: z.record(z.string(), {
          description: "Labels for the sandbox"
        }).optional(),
        public: z.boolean({
          description: "Whether the sandbox http preview is publicly accessible"
        }).optional(),
        cpu: z.number({
          description: "CPU cores allocated to the sandbox"
        }).optional(),
        gpu: z.number({
          description: "GPU units allocated to the sandbox"
        }).optional(),
        memory: z.number({
          description: "Memory allocated to the sandbox in GB"
        }).optional(),
        disk: z.number({
          description: "Disk space allocated to the sandbox in GB"
        }).optional(),
        autoStopInterval: z.number({
          description: "Auto-stop interval in minutes (0 means disabled)"
        }).optional(),
        autoArchiveInterval: z.number({
          description: "Auto-archive interval in minutes (0 means the maximum interval will be used)"
        }).optional(),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ snapshot, user, env, labels, public: isPublic, cpu, gpu, memory, disk, autoStopInterval, autoArchiveInterval, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const sandboxData: Record<string, any> = {
            snapshot,
            user,
            env,
            labels,
            public: isPublic,
            cpu,
            gpu,
            memory,
            disk,
            autoStopInterval,
            autoArchiveInterval
          };
          
          // Remove undefined values
          Object.keys(sandboxData).forEach(key => 
            sandboxData[key] === undefined && delete sandboxData[key]
          );
          
          const response = await daytonaClient.post('/sandbox', sandboxData, { headers });
          
          return formatResponse("Sandbox Created", response.data);
        } catch (error) {
          return handleApiError(error, "Failed to create sandbox");
        }
      }
    );

    server.tool(
      "deleteSandbox",
      "Delete a sandbox (with force option)",
      {
        sandboxId: z.string({
          description: "ID of the sandbox"
        }),
        force: z.boolean({
          description: "Force deletion"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ sandboxId, force, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          const params: Record<string, any> = { force };
          
          const response = await daytonaClient.delete(`/sandbox/${sandboxId}`, { 
            params,
            headers
          });
          
          return formatResponse(`Sandbox ${sandboxId} Deleted`, response.data || "Sandbox has been deleted");
        } catch (error) {
          return handleApiError(error, `Failed to delete sandbox ${sandboxId}`);
        }
      }
    );

    server.tool(
      "startSandbox",
      "Start a stopped sandbox",
      {
        sandboxId: z.string({
          description: "ID of the sandbox"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ sandboxId, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.post(`/sandbox/${sandboxId}/start`, {}, { headers });
          
          return formatResponse(`Sandbox ${sandboxId} Started`, response.data || "Sandbox has been started");
        } catch (error) {
          return handleApiError(error, `Failed to start sandbox ${sandboxId}`);
        }
      }
    );

    server.tool(
      "stopSandbox",
      "Stop a running sandbox",
      {
        sandboxId: z.string({
          description: "ID of the sandbox"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ sandboxId, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.post(`/sandbox/${sandboxId}/stop`, {}, { headers });
          
          return formatResponse(`Sandbox ${sandboxId} Stopped`, response.data || "Sandbox has been stopped");
        } catch (error) {
          return handleApiError(error, `Failed to stop sandbox ${sandboxId}`);
        }
      }
    );

    server.tool(
      "archiveSandbox",
      "Archive a sandbox",
      {
        sandboxId: z.string({
          description: "ID of the sandbox"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ sandboxId, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.post(`/sandbox/${sandboxId}/archive`, {}, { headers });
          
          return formatResponse(`Sandbox ${sandboxId} Archived`, response.data || "Sandbox has been archived");
        } catch (error) {
          return handleApiError(error, `Failed to archive sandbox ${sandboxId}`);
        }
      }
    );

    server.tool(
      "setSandboxLabels",
      "Update sandbox labels",
      {
        sandboxId: z.string({
          description: "ID of the sandbox"
        }),
        labels: z.record(z.string(), {
          description: "Key-value pairs of labels"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ sandboxId, labels, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.put(`/sandbox/${sandboxId}/labels`, { labels }, { headers });
          
          return formatResponse(`Sandbox ${sandboxId} Labels Updated`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to update labels for sandbox ${sandboxId}`);
        }
      }
    );

    server.tool(
      "createSandboxBackup",
      "Create a backup of a sandbox",
      {
        sandboxId: z.string({
          description: "ID of the sandbox"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ sandboxId, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.post(`/sandbox/${sandboxId}/backup`, {}, { headers });
          
          return formatResponse(`Sandbox ${sandboxId} Backup Created`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to create backup for sandbox ${sandboxId}`);
        }
      }
    );

    server.tool(
      "setAutoStopInterval",
      "Configure auto-stop for a sandbox",
      {
        sandboxId: z.string({
          description: "ID of the sandbox"
        }),
        interval: z.number({
          description: "Auto-stop interval in minutes (0 to disable)"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ sandboxId, interval, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.post(`/sandbox/${sandboxId}/autostop/${interval}`, {}, { headers });
          
          return formatResponse(`Sandbox ${sandboxId} Auto-stop Interval Set`, response.data || "Auto-stop interval has been set");
        } catch (error) {
          return handleApiError(error, `Failed to set auto-stop interval for sandbox ${sandboxId}`);
        }
      }
    );

    server.tool(
      "setAutoArchiveInterval",
      "Configure auto-archive for a sandbox",
      {
        sandboxId: z.string({
          description: "ID of the sandbox"
        }),
        interval: z.number({
          description: "Auto-archive interval in minutes (0 means the maximum interval will be used)"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ sandboxId, interval, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.post(`/sandbox/${sandboxId}/autoarchive/${interval}`, {}, { headers });
          
          return formatResponse(`Sandbox ${sandboxId} Auto-archive Interval Set`, response.data || "Auto-archive interval has been set");
        } catch (error) {
          return handleApiError(error, `Failed to set auto-archive interval for sandbox ${sandboxId}`);
        }
      }
    );

    server.tool(
      "getPortPreviewUrl",
      "Get preview URL for a sandbox port",
      {
        sandboxId: z.string({
          description: "ID of the sandbox"
        }),
        port: z.number({
          description: "Port number to get preview URL for"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ sandboxId, port, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.get(`/sandbox/${sandboxId}/ports/${port}/preview-url`, { headers });
          
          return formatResponse(`Sandbox ${sandboxId} Port ${port} Preview URL`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to get preview URL for sandbox ${sandboxId} port ${port}`);
        }
      }
    );

    server.tool(
      "getSandboxBuildLogs",
      "Get build logs for a sandbox",
      {
        sandboxId: z.string({
          description: "ID of the sandbox"
        }),
        follow: z.boolean({
          description: "Whether to follow the logs stream"
        }).optional(),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ sandboxId, follow, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          const params: Record<string, any> = { follow: follow || false };
          
          const response = await daytonaClient.get(`/sandbox/${sandboxId}/build-logs`, { 
            params,
            headers,
            responseType: 'text'
          });
          
          return formatResponse(`Sandbox ${sandboxId} Build Logs`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to get build logs for sandbox ${sandboxId}`);
        }
      }
    );

    // ==================== COMMAND EXECUTION & SESSIONS TOOLS ====================
    
    server.tool(
      "executeCommand",
      "Execute a command synchronously in a sandbox",
      {
        sandboxId: z.string({
          description: "ID of the sandbox"
        }),
        command: z.string({
          description: "The command to execute"
        }),
        cwd: z.string({
          description: "Current working directory"
        }).optional(),
        timeout: z.number({
          description: "Timeout in seconds, defaults to 10 seconds"
        }).optional(),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ sandboxId, command, cwd, timeout, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.post(`/toolbox/${sandboxId}/toolbox/process/execute`, {
            command,
            cwd: cwd || "/",
            timeout: timeout || 10
          }, { headers });
          
          return {
            content: [
              {
                type: "text" as const,
                text: `## Command Execution Result

**Exit Code:** ${response.data.exitCode}

**Output:**
\`\`\`
${response.data.result}
\`\`\`
`
              }
            ]
          };
        } catch (error) {
          return handleApiError(error, "Failed to execute command");
        }
      }
    );

    server.tool(
      "listSessions",
      "List all active sessions in a sandbox",
      {
        sandboxId: z.string({
          description: "ID of the sandbox"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ sandboxId, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.get(`/toolbox/${sandboxId}/toolbox/process/session`, { headers });
          
          return formatResponse(`Sandbox ${sandboxId} Sessions`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to list sessions for sandbox ${sandboxId}`);
        }
      }
    );

    server.tool(
      "createSession",
      "Create a new session in a sandbox",
      {
        sandboxId: z.string({
          description: "ID of the sandbox"
        }),
        sessionId: z.string({
          description: "The ID of the session"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ sandboxId, sessionId, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.post(`/toolbox/${sandboxId}/toolbox/process/session`, {
            sessionId
          }, { headers });
          
          return formatResponse(`Session Created in Sandbox ${sandboxId}`, response.data || "Session created successfully");
        } catch (error) {
          return handleApiError(error, `Failed to create session in sandbox ${sandboxId}`);
        }
      }
    );

    server.tool(
      "getSession",
      "Get details about a specific session",
      {
        sandboxId: z.string({
          description: "ID of the sandbox"
        }),
        sessionId: z.string({
          description: "The ID of the session"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ sandboxId, sessionId, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.get(`/toolbox/${sandboxId}/toolbox/process/session/${sessionId}`, { headers });
          
          return formatResponse(`Session ${sessionId} in Sandbox ${sandboxId}`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to get session ${sessionId} in sandbox ${sandboxId}`);
        }
      }
    );

    server.tool(
      "deleteSession",
      "Delete a specific session",
      {
        sandboxId: z.string({
          description: "ID of the sandbox"
        }),
        sessionId: z.string({
          description: "The ID of the session"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ sandboxId, sessionId, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.delete(`/toolbox/${sandboxId}/toolbox/process/session/${sessionId}`, { headers });
          
          return formatResponse(`Session ${sessionId} Deleted from Sandbox ${sandboxId}`, response.data || "Session deleted successfully");
        } catch (error) {
          return handleApiError(error, `Failed to delete session ${sessionId} in sandbox ${sandboxId}`);
        }
      }
    );

    server.tool(
      "executeSessionCommand",
      "Execute a command in a specific session",
      {
        sandboxId: z.string({
          description: "ID of the sandbox"
        }),
        sessionId: z.string({
          description: "The ID of the session"
        }),
        command: z.string({
          description: "The command to execute"
        }),
        runAsync: z.boolean({
          description: "Whether to execute the command asynchronously"
        }).optional(),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ sandboxId, sessionId, command, runAsync, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.post(`/toolbox/${sandboxId}/toolbox/process/session/${sessionId}/exec`, {
            command,
            runAsync: runAsync || false
          }, { headers });
          
          return {
            content: [
              {
                type: "text" as const,
                text: `## Session Command Execution Result

**Command ID:** ${response.data.cmdId || "N/A"}

**Exit Code:** ${response.data.exitCode !== undefined ? response.data.exitCode : "N/A"}

**Output:**
\`\`\`
${response.data.output || "No output or command running asynchronously"}
\`\`\`
`
              }
            ]
          };
        } catch (error) {
          return handleApiError(error, `Failed to execute command in session ${sessionId}`);
        }
      }
    );

    server.tool(
      "getSessionCommand",
      "Get details about a specific command",
      {
        sandboxId: z.string({
          description: "ID of the sandbox"
        }),
        sessionId: z.string({
          description: "The ID of the session"
        }),
        commandId: z.string({
          description: "The ID of the command"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ sandboxId, sessionId, commandId, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.get(`/toolbox/${sandboxId}/toolbox/process/session/${sessionId}/command/${commandId}`, { headers });
          
          return formatResponse(`Command ${commandId} in Session ${sessionId}`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to get command ${commandId} in session ${sessionId}`);
        }
      }
    );

    server.tool(
      "getSessionCommandLogs",
      "Get logs for a specific command in a session",
      {
        sandboxId: z.string({
          description: "ID of the sandbox"
        }),
        sessionId: z.string({
          description: "The ID of the session"
        }),
        commandId: z.string({
          description: "The ID of the command"
        }),
        follow: z.boolean({
          description: "Whether to follow the logs stream"
        }).optional(),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ sandboxId, sessionId, commandId, follow, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          const params: Record<string, any> = { follow: follow || false };
          
          const response = await daytonaClient.get(`/toolbox/${sandboxId}/toolbox/process/session/${sessionId}/command/${commandId}/logs`, { 
            params,
            headers,
            responseType: 'text'
          });
          
          return formatResponse(`Command ${commandId} Logs`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to get logs for command ${commandId}`);
        }
      }
    );

    // ==================== FILE OPERATIONS TOOLS ====================
    
    server.tool(
      "getProjectDir",
      "Get the project directory path",
      {
        sandboxId: z.string({
          description: "ID of the sandbox"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ sandboxId, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.get(`/toolbox/${sandboxId}/toolbox/project-dir`, { headers });
          
          return formatResponse(`Project Directory for Sandbox ${sandboxId}`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to get project directory for sandbox ${sandboxId}`);
        }
      }
    );

    server.tool(
      "listFiles",
      "List files in a directory",
      {
        sandboxId: z.string({
          description: "ID of the sandbox"
        }),
        path: z.string({
          description: "Path to list files from"
        }).optional(),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ sandboxId, path, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          const params: Record<string, any> = {};
          if (path) params.path = path;
          
          const response = await daytonaClient.get(`/toolbox/${sandboxId}/toolbox/files`, { 
            params,
            headers
          });
          
          return formatResponse(`Files in ${path || "/"} for Sandbox ${sandboxId}`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to list files in ${path || "/"}`);
        }
      }
    );

    server.tool(
      "downloadFile",
      "Download a file from a sandbox",
      {
        sandboxId: z.string({
          description: "ID of the sandbox"
        }),
        path: z.string({
          description: "Path to the file"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ sandboxId, path, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          const params: Record<string, any> = { path };
          
          const response = await daytonaClient.get(`/toolbox/${sandboxId}/toolbox/files/download`, { 
            params,
            headers,
            responseType: 'text'
          });
          
          return {
            content: [
              {
                type: "text" as const,
                text: `## File Content: ${path}

\`\`\`
${response.data}
\`\`\`
`
              }
            ]
          };
        } catch (error) {
          return handleApiError(error, `Failed to download file ${path}`);
        }
      }
    );

    server.tool(
      "deleteFile",
      "Delete a file in a sandbox",
      {
        sandboxId: z.string({
          description: "ID of the sandbox"
        }),
        path: z.string({
          description: "Path to the file"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ sandboxId, path, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          const params: Record<string, any> = { path };
          
          const response = await daytonaClient.delete(`/toolbox/${sandboxId}/toolbox/files`, { 
            params,
            headers
          });
          
          return formatResponse(`File Deleted: ${path}`, response.data || "File deleted successfully");
        } catch (error) {
          return handleApiError(error, `Failed to delete file ${path}`);
        }
      }
    );
  }
);

export { handler as GET, handler as POST, handler as DELETE };
