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
export type FocusTask = {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueLabel: string | null;
    overdue: boolean;
    href: string;
    project: { id: string; name: string };
};

/** What needs the user's attention, from tasks assigned to them. */
export type Focus = {
    overdue: number;
    today: number;
    week: number;
    upNext: FocusTask[];
};
