/**
 * Unit tests for vmService.js
 *
 * Tests cover: fetchTemplates, cloneVM, createVM, getNextVmId
 * All `fetch` calls are mocked via vitest's vi.stubGlobal.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module-level mock: stub out the config/api module so tests don't need a
// browser environment to compute the API base URL.
// ---------------------------------------------------------------------------
vi.mock('../config/api', () => ({
  API_ENDPOINTS: {
    VMS: 'http://test/api/vms',
    VM_DETAILS: (vmid) => `http://test/api/vms/${vmid}`,
    VNC_PROXY: (vmid) => `http://test/api/vms/${vmid}/vncproxy`,
    NODES: 'http://test/api/nodes',
    NEXT_VMID: 'http://test/api/nextid',
    TEMPLATES: 'http://test/api/templates',
    CLONE_VM: 'http://test/api/vms/clone',
    STORAGE: 'http://test/api/storage',
    NETWORKING: 'http://test/api/networking',
  },
}));

// ---------------------------------------------------------------------------
// Also stub out the cache utilities so they are no-ops during tests.
// ---------------------------------------------------------------------------
vi.mock('../utils/cache', () => ({
  getCachedData: vi.fn(() => null),
  setCachedData: vi.fn(),
  clearCache: vi.fn(),
}));

import {
  fetchTemplates,
  cloneVM,
  createVM,
  getNextVmId,
  fetchVMs,
  startVM,
  shutdownVM,
} from './vmService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Response-like object for vi.stubGlobal('fetch', ...). */
function mockFetch(body, { ok = true, status = 200 } = {}) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  });
}

function mockFetchError(message) {
  return vi.fn().mockRejectedValue(new Error(message));
}

// ---------------------------------------------------------------------------
// fetchTemplates
// ---------------------------------------------------------------------------

describe('fetchTemplates', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the templates array on success', async () => {
    const templates = [
      { vmid: 100, name: 'ubuntu-22', node: 'pve1' },
      { vmid: 200, name: 'debian-12', node: 'pve1' },
    ];
    vi.stubGlobal('fetch', mockFetch({ templates }));

    const result = await fetchTemplates();

    expect(result).toEqual(templates);
    expect(fetch).toHaveBeenCalledWith(
      'http://test/api/templates',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('returns an empty array when templates key is missing', async () => {
    vi.stubGlobal('fetch', mockFetch({}));
    const result = await fetchTemplates();
    expect(result).toEqual([]);
  });

  it('throws when the server returns a non-ok response', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'Cluster down' }, { ok: false, status: 500 }));
    await expect(fetchTemplates()).rejects.toThrow('Cluster down');
  });

  it('throws when fetch itself rejects (network error)', async () => {
    vi.stubGlobal('fetch', mockFetchError('Network failure'));
    await expect(fetchTemplates()).rejects.toThrow('Network failure');
  });
});

// ---------------------------------------------------------------------------
// cloneVM
// ---------------------------------------------------------------------------

describe('cloneVM', () => {
  afterEach(() => vi.unstubAllGlobals());

  const baseConfig = {
    node: 'pve1',
    vmid: 100,
    newid: 401,
    name: 'my-clone',
    full: true,
    storage: 'local-lvm',
  };

  it('posts to CLONE_VM endpoint with config body', async () => {
    vi.stubGlobal('fetch', mockFetch({ message: 'VM 401 cloned successfully' }, { status: 201 }));

    const result = await cloneVM(baseConfig);

    expect(result).toEqual({ message: 'VM 401 cloned successfully' });
    expect(fetch).toHaveBeenCalledWith(
      'http://test/api/vms/clone',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(baseConfig),
      }),
    );
  });

  it('throws when server returns an error', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'Template locked' }, { ok: false, status: 400 }));
    await expect(cloneVM(baseConfig)).rejects.toThrow('Template locked');
  });

  it('throws on network error', async () => {
    vi.stubGlobal('fetch', mockFetchError('Network timeout'));
    await expect(cloneVM(baseConfig)).rejects.toThrow('Network timeout');
  });

  it('sends linked-clone payload (full=false) correctly', async () => {
    vi.stubGlobal('fetch', mockFetch({ message: 'ok' }, { status: 201 }));
    const config = { node: 'pve1', vmid: 100, newid: 402, full: false };
    await cloneVM(config);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.full).toBe(false);
    expect(body.storage).toBeUndefined();
  });

  it('sends tags, description, and cloud-init fields when provided', async () => {
    vi.stubGlobal('fetch', mockFetch({ message: 'VM 403 cloned' }, { status: 201 }));
    const config = {
      ...baseConfig,
      newid: 403,
      tags: 'web;prod',
      description: 'My clone',
      ciuser: 'ubuntu',
      cipassword: 's3cr3t',
      sshkeys: 'ssh-rsa AAAA user@host',
      ipconfig0: 'ip=dhcp',
    };
    await cloneVM(config);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.tags).toBe('web;prod');
    expect(body.description).toBe('My clone');
    expect(body.ciuser).toBe('ubuntu');
    expect(body.cipassword).toBe('s3cr3t');
    expect(body.sshkeys).toBe('ssh-rsa AAAA user@host');
    expect(body.ipconfig0).toBe('ip=dhcp');
  });
});

// ---------------------------------------------------------------------------
// createVM
// ---------------------------------------------------------------------------

describe('createVM', () => {
  afterEach(() => vi.unstubAllGlobals());

  const baseConfig = {
    node: 'pve1',
    vmid: 300,
    name: 'test-vm',
    cores: 2,
    memory: 2048,
    storage: 'local-lvm',
    disk_gb: 20,
    start: false,
  };

  it('posts to VMS endpoint and returns response', async () => {
    vi.stubGlobal('fetch', mockFetch({ message: 'VM 300 created successfully' }, { status: 201 }));

    const result = await createVM(baseConfig);

    expect(result).toEqual({ message: 'VM 300 created successfully' });
    expect(fetch).toHaveBeenCalledWith(
      'http://test/api/vms',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(baseConfig),
      }),
    );
  });

  it('throws on server error with error message', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'Storage full' }, { ok: false, status: 500 }));
    await expect(createVM(baseConfig)).rejects.toThrow('Storage full');
  });

  it('throws on network error', async () => {
    vi.stubGlobal('fetch', mockFetchError('Connection refused'));
    await expect(createVM(baseConfig)).rejects.toThrow('Connection refused');
  });

  it('sends tags, description, and cloud-init fields when provided', async () => {
    vi.stubGlobal('fetch', mockFetch({ message: 'VM 300 created' }, { status: 201 }));
    const config = {
      ...baseConfig,
      tags: 'db;prod',
      description: 'Database VM',
      ciuser: 'admin',
      cipassword: 'pass',
      sshkeys: 'ssh-rsa BBBB admin@db',
      ipconfig0: 'ip=10.0.0.5/24,gw=10.0.0.1',
    };
    await createVM(config);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.tags).toBe('db;prod');
    expect(body.description).toBe('Database VM');
    expect(body.ciuser).toBe('admin');
    expect(body.cipassword).toBe('pass');
    expect(body.sshkeys).toBe('ssh-rsa BBBB admin@db');
    expect(body.ipconfig0).toBe('ip=10.0.0.5/24,gw=10.0.0.1');
  });
});

// ---------------------------------------------------------------------------
// getNextVmId
// ---------------------------------------------------------------------------

describe('getNextVmId', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the vmid number from the response', async () => {
    vi.stubGlobal('fetch', mockFetch({ vmid: 150 }));
    const result = await getNextVmId();
    expect(result).toBe(150);
    expect(fetch).toHaveBeenCalledWith(
      'http://test/api/nextid',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('throws when server returns an error', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'Cluster error' }, { ok: false, status: 500 }));
    await expect(getNextVmId()).rejects.toThrow('Cluster error');
  });

  it('throws on network error', async () => {
    vi.stubGlobal('fetch', mockFetchError('Timeout'));
    await expect(getNextVmId()).rejects.toThrow('Timeout');
  });
});

// ---------------------------------------------------------------------------
// fetchVMs (smoke test — caching/refresh behaviour)
// ---------------------------------------------------------------------------

describe('fetchVMs', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the vms array from the API', async () => {
    const vms = [{ vmid: 101, name: 'my-vm', status: 'running' }];
    vi.stubGlobal('fetch', mockFetch({ vms }));

    const result = await fetchVMs(true); // force refresh bypasses cache

    expect(result).toEqual(vms);
  });

  it('throws on server error', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'Backend down' }, { ok: false, status: 503 }));
    await expect(fetchVMs(true)).rejects.toThrow('Backend down');
  });
});

// ---------------------------------------------------------------------------
// startVM / shutdownVM (smoke tests)
// ---------------------------------------------------------------------------

describe('startVM', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts to the start endpoint', async () => {
    vi.stubGlobal('fetch', mockFetch({ message: 'VM 101 started' }));
    await startVM(101);
    expect(fetch).toHaveBeenCalledWith(
      'http://test/api/vms/101/start',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('shutdownVM', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts to the shutdown endpoint', async () => {
    vi.stubGlobal('fetch', mockFetch({ message: 'VM 101 shutdown' }));
    await shutdownVM(101);
    expect(fetch).toHaveBeenCalledWith(
      'http://test/api/vms/101/shutdown',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
