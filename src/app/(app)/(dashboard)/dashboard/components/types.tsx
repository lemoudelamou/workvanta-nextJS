export type Membership = {
    role: string;
    workspace: {
        id: string;
        slug: string;
        name: string;
        description: string | null;
        updatedAt: Date;
        _count: { members: number };
    };
};

export type RecentProject = {
    id: string;
    name: string;
    description: string | null;
    updatedAt: Date;
    visibility: string;
    isLocked: boolean;
    workspace: { id: string; slug: string; name: string };
};