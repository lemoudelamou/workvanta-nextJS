export type WorkspaceItem = {
    role: string;
    workspace: {
        id: string;
        slug: string;
        name: string;
        description: string | null;
        updatedAt: Date;
        _count: { members: number; projects: number };
    };
};