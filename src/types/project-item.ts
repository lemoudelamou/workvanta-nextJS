export type ProjectItem = {
    id: string;
    name: string;
    description: string | null;
    visibility: string;
    updatedAt: Date;
    accessible: boolean;
    /** Tasks per status, for the card's progress bar. */
    counts?: { TODO: number; IN_PROGRESS: number; IN_REVIEW: number; DONE: number };
    /** A few people with tasks assigned in this project. */
    people?: { id: string; name: string | null; email: string; image: string | null }[];
};