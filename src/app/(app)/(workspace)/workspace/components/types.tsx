export type WorkspaceItem = {
    role: string;
    workspace: {
        id: string;
        slug: string;
        name: string;
        description: string | null;
        updatedAt: Date;
        _count: { members: number; projects: number };
        /** The first few people, for the card's faces. */
        members?: { user: { id: string; name: string | null; email: string; image: string | null } }[];
    };
};
