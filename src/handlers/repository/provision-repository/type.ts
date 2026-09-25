export interface ProvisionRepositoryRequest {
    name: string;
    description: string;
    visibility: string[];
    topics?: string;
}

export interface ProvisionRepositoryWorkflowRequest {
    name: string;
    description: string;
    isPublic: boolean;
    topics: string[];
}
