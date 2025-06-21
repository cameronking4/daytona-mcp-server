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
  baseURL: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
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
    // ==================== API KEYS MANAGEMENT ====================
    
    server.tool(
      "listApiKeys",
      "List all API keys for the authenticated user or organization",
      {
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.get('/api-keys', { headers });
          
          return formatResponse("API Keys", response.data);
        } catch (error) {
          return handleApiError(error, "Failed to list API keys");
        }
      }
    );

    server.tool(
      "createApiKey",
      "Create a new API key with specified permissions",
      {
        name: z.string({
          description: "The name of the API key"
        }),
        permissions: z.array(z.string(), {
          description: "The list of organization resource permissions assigned to the API key"
        }),
        expiresAt: z.string({
          description: "When the API key expires (ISO date string)"
        }).optional(),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ name, permissions, expiresAt, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.post('/api-keys', {
            name,
            permissions,
            expiresAt
          }, { headers });
          
          return formatResponse("API Key Created", response.data);
        } catch (error) {
          return handleApiError(error, "Failed to create API key");
        }
      }
    );

    server.tool(
      "getApiKey",
      "Get details of a specific API key by name",
      {
        name: z.string({
          description: "The name of the API key"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ name, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.get(`/api-keys/${name}`, { headers });
          
          return formatResponse(`API Key: ${name}`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to get API key ${name}`);
        }
      }
    );

    server.tool(
      "deleteApiKey",
      "Delete an API key by name",
      {
        name: z.string({
          description: "The name of the API key"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ name, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.delete(`/api-keys/${name}`, { headers });
          
          return formatResponse(`API Key Deleted: ${name}`, "API key deleted successfully");
        } catch (error) {
          return handleApiError(error, `Failed to delete API key ${name}`);
        }
      }
    );

    server.tool(
      "getCurrentApiKey",
      "Get details of the current API key being used",
      {
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.get('/api-keys/current', { headers });
          
          return formatResponse("Current API Key", response.data);
        } catch (error) {
          return handleApiError(error, "Failed to get current API key");
        }
      }
    );

    // ==================== ORGANIZATIONS MANAGEMENT ====================
    
    server.tool(
      "listOrganizations",
      "List all organizations for the authenticated user",
      {},
      async () => {
        try {
          const response = await daytonaClient.get('/organizations');
          
          return formatResponse("Organizations", response.data);
        } catch (error) {
          return handleApiError(error, "Failed to list organizations");
        }
      }
    );

    server.tool(
      "createOrganization",
      "Create a new organization",
      {
        name: z.string({
          description: "The name of the organization"
        })
      },
      async ({ name }) => {
        try {
          const response = await daytonaClient.post('/organizations', { name });
          
          return formatResponse("Organization Created", response.data);
        } catch (error) {
          return handleApiError(error, "Failed to create organization");
        }
      }
    );

    server.tool(
      "getOrganization",
      "Get details of a specific organization by ID",
      {
        organizationId: z.string({
          description: "Organization ID"
        })
      },
      async ({ organizationId }) => {
        try {
          const response = await daytonaClient.get(`/organizations/${organizationId}`);
          
          return formatResponse(`Organization: ${organizationId}`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to get organization ${organizationId}`);
        }
      }
    );

    server.tool(
      "deleteOrganization",
      "Delete an organization by ID",
      {
        organizationId: z.string({
          description: "Organization ID"
        })
      },
      async ({ organizationId }) => {
        try {
          const response = await daytonaClient.delete(`/organizations/${organizationId}`);
          
          return formatResponse(`Organization Deleted: ${organizationId}`, "Organization deleted successfully");
        } catch (error) {
          return handleApiError(error, `Failed to delete organization ${organizationId}`);
        }
      }
    );

    server.tool(
      "getOrganizationUsage",
      "Get usage overview for an organization",
      {
        organizationId: z.string({
          description: "Organization ID"
        })
      },
      async ({ organizationId }) => {
        try {
          const response = await daytonaClient.get(`/organizations/${organizationId}/usage`);
          
          return formatResponse(`Organization Usage: ${organizationId}`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to get usage for organization ${organizationId}`);
        }
      }
    );

    server.tool(
      "updateOrganizationQuota",
      "Update quota settings for an organization",
      {
        organizationId: z.string({
          description: "Organization ID"
        }),
        totalCpuQuota: z.number({
          description: "Total CPU quota"
        }).optional(),
        totalMemoryQuota: z.number({
          description: "Total memory quota"
        }).optional(),
        totalDiskQuota: z.number({
          description: "Total disk quota"
        }).optional(),
        maxCpuPerSandbox: z.number({
          description: "Maximum CPU per sandbox"
        }).optional(),
        maxMemoryPerSandbox: z.number({
          description: "Maximum memory per sandbox"
        }).optional(),
        maxDiskPerSandbox: z.number({
          description: "Maximum disk per sandbox"
        }).optional(),
        snapshotQuota: z.number({
          description: "Snapshot quota"
        }).optional(),
        maxSnapshotSize: z.number({
          description: "Maximum snapshot size"
        }).optional(),
        volumeQuota: z.number({
          description: "Volume quota"
        }).optional()
      },
      async ({ organizationId, ...quotaSettings }) => {
        try {
          const response = await daytonaClient.patch(`/organizations/${organizationId}/quota`, quotaSettings);
          
          return formatResponse(`Organization Quota Updated: ${organizationId}`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to update quota for organization ${organizationId}`);
        }
      }
    );

    // ==================== ORGANIZATION MEMBERS & ROLES ====================
    
    server.tool(
      "listOrganizationMembers",
      "List all members of an organization",
      {
        organizationId: z.string({
          description: "Organization ID"
        })
      },
      async ({ organizationId }) => {
        try {
          const response = await daytonaClient.get(`/organizations/${organizationId}/users`);
          
          return formatResponse(`Organization Members: ${organizationId}`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to list members for organization ${organizationId}`);
        }
      }
    );

    server.tool(
      "updateMemberRole",
      "Update role for an organization member",
      {
        organizationId: z.string({
          description: "Organization ID"
        }),
        userId: z.string({
          description: "User ID"
        }),
        role: z.string({
          description: "Organization member role (owner or member)"
        })
      },
      async ({ organizationId, userId, role }) => {
        try {
          const response = await daytonaClient.post(`/organizations/${organizationId}/users/${userId}/role`, { role });
          
          return formatResponse(`Member Role Updated: ${userId}`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to update role for member ${userId}`);
        }
      }
    );

    server.tool(
      "deleteOrganizationMember",
      "Remove a member from an organization",
      {
        organizationId: z.string({
          description: "Organization ID"
        }),
        userId: z.string({
          description: "User ID"
        })
      },
      async ({ organizationId, userId }) => {
        try {
          const response = await daytonaClient.delete(`/organizations/${organizationId}/users/${userId}`);
          
          return formatResponse(`Member Removed: ${userId}`, "Member removed successfully");
        } catch (error) {
          return handleApiError(error, `Failed to remove member ${userId}`);
        }
      }
    );

    server.tool(
      "listOrganizationRoles",
      "List all roles in an organization",
      {
        organizationId: z.string({
          description: "Organization ID"
        })
      },
      async ({ organizationId }) => {
        try {
          const response = await daytonaClient.get(`/organizations/${organizationId}/roles`);
          
          return formatResponse(`Organization Roles: ${organizationId}`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to list roles for organization ${organizationId}`);
        }
      }
    );

    server.tool(
      "createOrganizationRole",
      "Create a new role in an organization",
      {
        organizationId: z.string({
          description: "Organization ID"
        }),
        name: z.string({
          description: "The name of the role"
        }),
        description: z.string({
          description: "The description of the role"
        }),
        permissions: z.array(z.string(), {
          description: "The list of permissions assigned to the role"
        })
      },
      async ({ organizationId, name, description, permissions }) => {
        try {
          const response = await daytonaClient.post(`/organizations/${organizationId}/roles`, {
            name,
            description,
            permissions
          });
          
          return formatResponse(`Role Created: ${name}`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to create role ${name}`);
        }
      }
    );

    // ==================== SANDBOX MANAGEMENT ====================
    
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
          description: "The ID or name of the snapshot used for the sandbox. Default is 'daytonaio/sandbox:0.3.0'"
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

    // ==================== SNAPSHOTS MANAGEMENT ====================
    
    server.tool(
      "listSnapshots",
      "List all snapshots with pagination",
      {
        limit: z.number({
          description: "Number of items per page"
        }).optional(),
        page: z.number({
          description: "Page number"
        }).optional(),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ limit, page, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          const params: Record<string, any> = {};
          if (limit) params.limit = limit;
          if (page) params.page = page;
          
          const response = await daytonaClient.get('/snapshots', { 
            params,
            headers
          });
          
          return formatResponse("Snapshots", response.data);
        } catch (error) {
          return handleApiError(error, "Failed to list snapshots");
        }
      }
    );

    server.tool(
      "getSnapshot",
      "Get detailed information about a specific snapshot",
      {
        id: z.string({
          description: "ID or name of the snapshot"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ id, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.get(`/snapshots/${id}`, { headers });
          
          return formatResponse(`Snapshot: ${id}`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to get snapshot ${id}`);
        }
      }
    );

    server.tool(
      "createSnapshot",
      "Create a new snapshot",
      {
        name: z.string({
          description: "The name of the snapshot"
        }),
        imageName: z.string({
          description: "The image name of the snapshot"
        }).optional(),
        entrypoint: z.array(z.string(), {
          description: "The entrypoint command for the snapshot"
        }).optional(),
        general: z.boolean({
          description: "Whether the snapshot is general"
        }).optional(),
        cpu: z.number({
          description: "CPU cores allocated to the resulting sandbox"
        }).optional(),
        gpu: z.number({
          description: "GPU units allocated to the resulting sandbox"
        }).optional(),
        memory: z.number({
          description: "Memory allocated to the resulting sandbox in GB"
        }).optional(),
        disk: z.number({
          description: "Disk space allocated to the sandbox in GB"
        }).optional(),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ name, imageName, entrypoint, general, cpu, gpu, memory, disk, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const snapshotData: Record<string, any> = {
            name,
            imageName,
            entrypoint,
            general,
            cpu,
            gpu,
            memory,
            disk
          };
          
          // Remove undefined values
          Object.keys(snapshotData).forEach(key => 
            snapshotData[key] === undefined && delete snapshotData[key]
          );
          
          const response = await daytonaClient.post('/snapshots', snapshotData, { headers });
          
          return formatResponse("Snapshot Created", response.data);
        } catch (error) {
          return handleApiError(error, "Failed to create snapshot");
        }
      }
    );

    server.tool(
      "deleteSnapshot",
      "Delete a snapshot",
      {
        id: z.string({
          description: "ID of the snapshot"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ id, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.delete(`/snapshots/${id}`, { headers });
          
          return formatResponse(`Snapshot ${id} Deleted`, response.data || "Snapshot has been deleted");
        } catch (error) {
          return handleApiError(error, `Failed to delete snapshot ${id}`);
        }
      }
    );

    // ==================== VOLUMES MANAGEMENT ====================
    
    server.tool(
      "listVolumes",
      "List all volumes",
      {
        includeDeleted: z.boolean({
          description: "Include deleted volumes in the response"
        }).optional(),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ includeDeleted, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          const params: Record<string, any> = {};
          if (includeDeleted !== undefined) params.includeDeleted = includeDeleted;
          
          const response = await daytonaClient.get('/volumes', { 
            params,
            headers
          });
          
          return formatResponse("Volumes", response.data);
        } catch (error) {
          return handleApiError(error, "Failed to list volumes");
        }
      }
    );

    server.tool(
      "getVolume",
      "Get detailed information about a specific volume",
      {
        volumeId: z.string({
          description: "ID of the volume"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ volumeId, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.get(`/volumes/${volumeId}`, { headers });
          
          return formatResponse(`Volume: ${volumeId}`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to get volume ${volumeId}`);
        }
      }
    );

    server.tool(
      "getVolumeByName",
      "Get detailed information about a specific volume by name",
      {
        name: z.string({
          description: "Name of the volume"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ name, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.get(`/volumes/by-name/${name}`, { headers });
          
          return formatResponse(`Volume: ${name}`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to get volume ${name}`);
        }
      }
    );

    server.tool(
      "createVolume",
      "Create a new volume",
      {
        name: z.string({
          description: "The name of the volume"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ name, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.post('/volumes', { name }, { headers });
          
          return formatResponse("Volume Created", response.data);
        } catch (error) {
          return handleApiError(error, "Failed to create volume");
        }
      }
    );

    server.tool(
      "deleteVolume",
      "Delete a volume",
      {
        volumeId: z.string({
          description: "ID of the volume"
        }),
        organizationId: z.string({
          description: "Organization ID (optional, uses default from API key if not provided)"
        }).optional()
      },
      async ({ volumeId, organizationId }) => {
        try {
          const headers: Record<string, string> = organizationId ? { "X-Daytona-Organization-ID": organizationId } : {};
          
          const response = await daytonaClient.delete(`/volumes/${volumeId}`, { headers });
          
          return formatResponse(`Volume ${volumeId} Deleted`, response.data || "Volume has been marked for deletion");
        } catch (error) {
          return handleApiError(error, `Failed to delete volume ${volumeId}`);
        }
      }
    );

    // ==================== SANDBOX COMMAND EXECUTION ====================
    
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
          
          const requestData: Record<string, any> = {
            command,
            cwd,
            timeout
          };
          
          // Remove undefined values
          Object.keys(requestData).forEach(key => 
            requestData[key] === undefined && delete requestData[key]
          );
          
          const response = await daytonaClient.post(`/toolbox/${sandboxId}/toolbox/process/execute`, requestData, { headers });
          
          return formatResponse(`Command Executed in Sandbox ${sandboxId}`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to execute command in sandbox ${sandboxId}`);
        }
      }
    );

    // ==================== SANDBOX SESSION MANAGEMENT ====================
    
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
          
          return formatResponse(`Sessions in Sandbox ${sandboxId}`, response.data);
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
          
          return formatResponse(`Session Created in Sandbox ${sandboxId}`, response.data || `Session ${sessionId} created successfully`);
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
          
          const requestData: Record<string, any> = {
            command,
            runAsync
          };
          
          // Remove undefined values
          Object.keys(requestData).forEach(key => 
            requestData[key] === undefined && delete requestData[key]
          );
          
          const response = await daytonaClient.post(`/toolbox/${sandboxId}/toolbox/process/session/${sessionId}/exec`, requestData, { headers });
          
          return formatResponse(`Command Executed in Session ${sessionId}`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to execute command in session ${sessionId} in sandbox ${sandboxId}`);
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
          return handleApiError(error, `Failed to get command ${commandId} in session ${sessionId} in sandbox ${sandboxId}`);
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
          const params: Record<string, any> = {};
          if (follow !== undefined) params.follow = follow;
          
          const response = await daytonaClient.get(`/toolbox/${sandboxId}/toolbox/process/session/${sessionId}/command/${commandId}/logs`, { 
            params,
            headers
          });
          
          return formatResponse(`Logs for Command ${commandId} in Session ${sessionId}`, response.data);
        } catch (error) {
          return handleApiError(error, `Failed to get logs for command ${commandId} in session ${sessionId} in sandbox ${sandboxId}`);
        }
      }
    );
  }
);

export const GET = handler;
export const POST = handler;
