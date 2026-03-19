/**
 * AI Tool Definitions + Executor
 * Maps OpenAI function-calling schemas to portal API calls.
 */
import API_BASE_URL from '../config/api';

// ---------------------------------------------------------------------------
// Tool definitions (OpenAI function-calling schema)
// ---------------------------------------------------------------------------

export const AI_TOOLS = [
  // VM Tools
  {
    type: 'function',
    function: {
      name: 'list_vms',
      description: 'List all virtual machines managed by the portal (Proxmox, Azure, AWS).',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_vm_metrics',
      description: 'Get real-time CPU, memory, disk, and network metrics for a specific VM.',
      parameters: {
        type: 'object',
        properties: {
          vmid: { type: 'string', description: 'The VM ID (e.g. "100")' },
        },
        required: ['vmid'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'start_vm',
      description: 'Start a stopped virtual machine.',
      parameters: {
        type: 'object',
        properties: {
          vmid: { type: 'string', description: 'The VM ID to start' },
        },
        required: ['vmid'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'stop_vm',
      description: 'Gracefully shut down a running virtual machine.',
      parameters: {
        type: 'object',
        properties: {
          vmid: { type: 'string', description: 'The VM ID to shut down' },
        },
        required: ['vmid'],
      },
    },
  },

  // Docker Tools
  {
    type: 'function',
    function: {
      name: 'list_containers',
      description: 'List all Docker containers.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'start_container',
      description: 'Start a stopped Docker container.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Container ID or name' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'stop_container',
      description: 'Stop a running Docker container.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Container ID or name' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_container_logs',
      description: 'Get recent logs from a Docker container.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Container ID or name' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_images',
      description: 'List all Docker images.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // Kubernetes Tools
  {
    type: 'function',
    function: {
      name: 'list_pods',
      description: 'List all Kubernetes pods across all namespaces.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_deployments',
      description: 'List all Kubernetes deployments.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'scale_deployment',
      description: 'Scale a Kubernetes deployment to the specified number of replicas.',
      parameters: {
        type: 'object',
        properties: {
          namespace: { type: 'string', description: 'Kubernetes namespace' },
          name: { type: 'string', description: 'Deployment name' },
          replicas: { type: 'integer', description: 'Desired number of replicas' },
        },
        required: ['namespace', 'name', 'replicas'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_pod_logs',
      description: 'Get logs from a specific Kubernetes pod.',
      parameters: {
        type: 'object',
        properties: {
          namespace: { type: 'string', description: 'Kubernetes namespace' },
          name: { type: 'string', description: 'Pod name' },
        },
        required: ['namespace', 'name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_services',
      description: 'List all Kubernetes services.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_nodes',
      description: 'List all Kubernetes nodes.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // VyOS Tools
  {
    type: 'function',
    function: {
      name: 'list_vyos_devices',
      description: 'List all VyOS network devices.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_interfaces',
      description: 'List network interfaces on a VyOS device.',
      parameters: {
        type: 'object',
        properties: {
          deviceId: { type: 'string', description: 'VyOS device ID' },
        },
        required: ['deviceId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_firewall_policies',
      description: 'List firewall policies on a VyOS device.',
      parameters: {
        type: 'object',
        properties: {
          deviceId: { type: 'string', description: 'VyOS device ID' },
        },
        required: ['deviceId'],
      },
    },
  },

  // Storage & Networking
  {
    type: 'function',
    function: {
      name: 'list_storage',
      description: 'List all storage resources.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_networking',
      description: 'List networking resources (bridges, VLANs, etc.).',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // Labs Tools
  {
    type: 'function',
    function: {
      name: 'list_labs',
      description: 'List all available labs.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_lab_status',
      description: 'Get the current status of a specific lab.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Lab ID' },
        },
        required: ['id'],
      },
    },
  },

  // DNS Tools
  {
    type: 'function',
    function: {
      name: 'list_dns_customers',
      description: 'List all DNS customers.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

// ---------------------------------------------------------------------------
// Tool executor
// ---------------------------------------------------------------------------

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function executeTool(name, args) {
  const base = API_BASE_URL;

  switch (name) {
    // VM
    case 'list_vms':
      return apiFetch(`${base}/api/vms`);
    case 'get_vm_metrics':
      return apiFetch(`${base}/api/vms/${args.vmid}/metrics`);
    case 'start_vm':
      return apiFetch(`${base}/api/vms/${args.vmid}/start`, { method: 'POST' });
    case 'stop_vm':
      return apiFetch(`${base}/api/vms/${args.vmid}/shutdown`, { method: 'POST' });

    // Docker
    case 'list_containers':
      return apiFetch(`${base}/api/docker/containers`);
    case 'start_container':
      return apiFetch(`${base}/api/docker/containers/${args.id}/start`, { method: 'POST' });
    case 'stop_container':
      return apiFetch(`${base}/api/docker/containers/${args.id}/stop`, { method: 'POST' });
    case 'get_container_logs':
      return apiFetch(`${base}/api/docker/containers/${args.id}/logs`);
    case 'list_images':
      return apiFetch(`${base}/api/docker/images`);

    // Kubernetes
    case 'list_pods':
      return apiFetch(`${base}/api/k8s/pods`);
    case 'list_deployments':
      return apiFetch(`${base}/api/k8s/deployments`);
    case 'scale_deployment':
      return apiFetch(`${base}/api/k8s/deployments/${args.namespace}/${args.name}/scale`, {
        method: 'PATCH',
        body: JSON.stringify({ replicas: args.replicas }),
      });
    case 'get_pod_logs':
      return apiFetch(`${base}/api/k8s/pods/${args.namespace}/${args.name}/logs`);
    case 'list_services':
      return apiFetch(`${base}/api/k8s/services`);
    case 'list_nodes':
      return apiFetch(`${base}/api/k8s/nodes`);

    // VyOS
    case 'list_vyos_devices':
      return apiFetch(`${base}/api/vyos/devices`);
    case 'list_interfaces':
      return apiFetch(`${base}/api/vyos/${args.deviceId}/networks`);
    case 'list_firewall_policies':
      return apiFetch(`${base}/api/vyos/${args.deviceId}/firewall/policies`);

    // Storage & Networking
    case 'list_storage':
      return apiFetch(`${base}/api/storage`);
    case 'list_networking':
      return apiFetch(`${base}/api/networking`);

    // Labs
    case 'list_labs':
      return apiFetch(`${base}/api/labs`);
    case 'get_lab_status':
      return apiFetch(`${base}/api/labs/${args.id}/status`);

    // DNS
    case 'list_dns_customers':
      return apiFetch(`${base}/api/dns/customers`);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
