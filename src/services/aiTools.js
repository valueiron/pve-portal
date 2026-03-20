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

  // Tickets Tools
  {
    type: 'function',
    function: {
      name: 'list_boards',
      description: 'List all Kanban boards.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_board',
      description: 'Create a new Kanban board.',
      parameters: {
        type: 'object',
        properties: {
          name:        { type: 'string', description: 'Board name (required)' },
          description: { type: 'string', description: 'Optional description' },
          color:       { type: 'string', description: 'Hex color, e.g. #6366f1' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_columns',
      description: 'List all columns for a board, ordered by position.',
      parameters: {
        type: 'object',
        properties: {
          board_id: { type: 'integer', description: 'Board ID' },
        },
        required: ['board_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_column',
      description: 'Create a new column in a board.',
      parameters: {
        type: 'object',
        properties: {
          board_id:  { type: 'integer', description: 'Board ID' },
          name:      { type: 'string',  description: 'Column name (required)' },
          color:     { type: 'string',  description: 'Hex color' },
          wip_limit: { type: 'integer', description: 'Max tickets (0 = unlimited)' },
        },
        required: ['board_id', 'name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_tickets',
      description: 'List all tickets on a board. Optionally filter by column.',
      parameters: {
        type: 'object',
        properties: {
          board_id:  { type: 'integer', description: 'Board ID' },
          column_id: { type: 'integer', description: 'Optional column filter' },
        },
        required: ['board_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_ticket',
      description: 'Create a new ticket on a board.',
      parameters: {
        type: 'object',
        properties: {
          board_id:    { type: 'integer', description: 'Board ID' },
          column_id:   { type: 'integer', description: 'Column to place the ticket in' },
          title:       { type: 'string',  description: 'Ticket title (required)' },
          description: { type: 'string',  description: 'Detailed description' },
          priority:    { type: 'string',  enum: ['low', 'medium', 'high', 'critical'], description: 'Priority level' },
          type:        { type: 'string',  enum: ['bug', 'feature', 'task', 'improvement', 'docs'], description: 'Ticket type' },
          assignee:    { type: 'string',  description: 'Name or username of assignee' },
          labels:      { type: 'string',  description: 'JSON array of label strings, e.g. \'["infra","urgent"]\'' },
        },
        required: ['board_id', 'column_id', 'title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_ticket',
      description: 'Update fields on an existing ticket. Omit fields to keep current values.',
      parameters: {
        type: 'object',
        properties: {
          board_id:    { type: 'integer', description: 'Board ID' },
          ticket_id:   { type: 'integer', description: 'Ticket ID' },
          title:       { type: 'string' },
          description: { type: 'string' },
          priority:    { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          type:        { type: 'string', enum: ['bug', 'feature', 'task', 'improvement', 'docs'] },
          assignee:    { type: 'string' },
          labels:      { type: 'string', description: 'JSON array of label strings' },
          column_id:   { type: 'integer', description: 'Move ticket to this column' },
        },
        required: ['board_id', 'ticket_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'move_ticket',
      description: 'Move a ticket to a different column (and optionally a specific position within it).',
      parameters: {
        type: 'object',
        properties: {
          board_id:  { type: 'integer', description: 'Board ID' },
          ticket_id: { type: 'integer', description: 'Ticket ID' },
          column_id: { type: 'integer', description: 'Target column ID' },
          position:  { type: 'integer', description: 'Zero-based position in target column (default 0)' },
        },
        required: ['board_id', 'ticket_id', 'column_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_ticket',
      description: 'Permanently delete a ticket.',
      parameters: {
        type: 'object',
        properties: {
          board_id:  { type: 'integer', description: 'Board ID' },
          ticket_id: { type: 'integer', description: 'Ticket ID' },
        },
        required: ['board_id', 'ticket_id'],
      },
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

    // Tickets
    case 'list_boards':
      return apiFetch(`${base}/api/tickets/boards`);

    case 'create_board':
      return apiFetch(`${base}/api/tickets/boards`, {
        method: 'POST',
        body: JSON.stringify({ name: args.name, description: args.description || '', color: args.color || '#6366f1' }),
      });

    case 'list_columns':
      return apiFetch(`${base}/api/tickets/boards/${args.board_id}/columns`);

    case 'create_column':
      return apiFetch(`${base}/api/tickets/boards/${args.board_id}/columns`, {
        method: 'POST',
        body: JSON.stringify({ name: args.name, color: args.color || '#6366f1', wip_limit: args.wip_limit || 0 }),
      });

    case 'list_tickets': {
      const url = args.column_id
        ? `${base}/api/tickets/boards/${args.board_id}/tickets?column_id=${args.column_id}`
        : `${base}/api/tickets/boards/${args.board_id}/tickets`;
      return apiFetch(url);
    }

    case 'create_ticket':
      return apiFetch(`${base}/api/tickets/boards/${args.board_id}/tickets`, {
        method: 'POST',
        body: JSON.stringify({
          column_id:   args.column_id,
          title:       args.title,
          description: args.description || '',
          priority:    args.priority || 'medium',
          type:        args.type || 'task',
          assignee:    args.assignee || '',
          labels:      args.labels || '[]',
          position:    0,
        }),
      });

    case 'update_ticket':
      return apiFetch(`${base}/api/tickets/boards/${args.board_id}/tickets/${args.ticket_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          column_id:   args.column_id,
          title:       args.title,
          description: args.description,
          priority:    args.priority,
          type:        args.type,
          assignee:    args.assignee,
          labels:      args.labels,
          position:    args.position || 0,
        }),
      });

    case 'move_ticket':
      return apiFetch(`${base}/api/tickets/boards/${args.board_id}/tickets/${args.ticket_id}/move`, {
        method: 'PUT',
        body: JSON.stringify({ column_id: args.column_id, position: args.position || 0 }),
      });

    case 'delete_ticket':
      return apiFetch(`${base}/api/tickets/boards/${args.board_id}/tickets/${args.ticket_id}`, {
        method: 'DELETE',
      });

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
