
export function parseMentions(content: string): string[] {
    const matches = content.match(
        /@\[([^\]]+)\]\(([^)]+)\)/g,
    );

    if (!matches) {
        return [];
    }

    return [
        ...new Set(
            matches
                .map((mention) => {
                    const match = mention.match(
                        /@\[([^\]]+)\]\(([^)]+)\)/,
                    );

                    return match?.[2]?.toLowerCase();
                })
                .filter(
                    (email): email is string =>
                        Boolean(email),
                ),
        ),
    ];
}
