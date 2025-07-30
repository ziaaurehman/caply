interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface CreateClientData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  notes?: string;
}

interface UpdateClientData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  notes?: string;
}

interface ClientsResponse {
  clients: Client[];
}

interface ClientResponse {
  client: Client;
}

// Clients API
export const clientAPI = {
  // Get all clients
  getClients: async (organizationId: string): Promise<ClientsResponse> => {
    const response = await fetch(`/api/clients?organizationId=${organizationId}`, {
      headers: {
        'x-organization-id': organizationId,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch clients');
    }
    const data = await response.json();
    return { clients: data.clients || [] };
  },

  // Get single client by ID
  getClient: async (id: string, organizationId: string): Promise<ClientResponse> => {
    const response = await fetch(`/api/clients/${id}`, {
      headers: {
        'x-organization-id': organizationId,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch client');
    }
    const data = await response.json();
    return { client: data.client };
  },

  // Create new client
  createClient: async (data: CreateClientData & { organizationId: string }): Promise<ClientResponse> => {
    const { organizationId, ...clientData } = data;
    
    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': organizationId,
      },
      body: JSON.stringify({
        ...clientData,
        organizationId // Pass organizationId in body for the API to extract
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create client');
    }
    
    const result = await response.json();
    return { client: result.client };
  },

  // Update existing client
  updateClient: async (id: string, data: UpdateClientData & { organizationId?: string }): Promise<ClientResponse> => {
    const { organizationId, ...clientData } = data;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (organizationId) {
      headers['x-organization-id'] = organizationId;
    }
    
    const response = await fetch(`/api/clients/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(clientData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update client');
    }
    
    const result = await response.json();
    return { client: result.client };
  },

  // Delete client
  deleteClient: async (id: string, organizationId?: string): Promise<void> => {
    const headers: Record<string, string> = {};
    
    if (organizationId) {
      headers['x-organization-id'] = organizationId;
    }
    
    const response = await fetch(`/api/clients/${id}`, {
      method: 'DELETE',
      headers
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete client');
    }
  }
};

export type {
  Client,
  CreateClientData,
  UpdateClientData,
  ClientsResponse,
  ClientResponse
};
