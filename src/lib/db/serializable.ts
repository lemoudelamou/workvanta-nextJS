import { prisma } from "@/lib/db/prisma";

export type Tx = Pick<typeof prisma, "task" | "activity">;

const MAX_ATTEMPTS = 3;

export async function runSerializable<T>(work: (tx: Tx) => Promise<T>) {
    for (let attempt = 1; ; attempt++) {
        try {
            return await prisma.$transaction(work, { isolationLevel: "Serializable" });
        } catch (error) {
            const isConflict = (error as { code?: string })?.code === "P2034";

            if (!isConflict || attempt >= MAX_ATTEMPTS) {
                throw error;
            }
        }
    }
}