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
  getClients: async (): Promise<ClientsResponse> => {
    const response = await fetch('/api/clients');
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch clients');
    }
    const data = await response.json();
    return { clients: data.clients || [] };
  },

  // Get single client by ID
  getClient: async (id: string): Promise<ClientResponse> => {
    const response = await fetch(`/api/clients/${id}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch client');
    }
    const data = await response.json();
    return { client: data.client };
  },

  // Create new client
  createClient: async (data: CreateClientData): Promise<ClientResponse> => {
    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create client');
    }
    
    const result = await response.json();
    return { client: result.client };
  },

  // Update existing client
  updateClient: async (id: string, data: UpdateClientData): Promise<ClientResponse> => {
    const response = await fetch(`/api/clients/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update client');
    }
    
    const result = await response.json();
    return { client: result.client };
  },

  // Delete client
  deleteClient: async (id: string): Promise<void> => {
    const response = await fetch(`/api/clients/${id}`, {
      method: 'DELETE'
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
