export type ProjectItem = {
    id: string;
    name: string;
    description: string | null;
    visibility: string;
    updatedAt: Date;
    accessible: boolean;
};