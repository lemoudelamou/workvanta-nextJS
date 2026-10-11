
export function endOfDay(date: string) {
    const parsed = new Date(`${date}T23:59:59Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}