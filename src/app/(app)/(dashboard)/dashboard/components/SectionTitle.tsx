type Props = {
    title: string;
    description: string;
};

export function SectionTitle({
    title,
    description,
}: Props) {
    return (
        <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {title}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
                {description}
            </p>
        </div>
    );
}