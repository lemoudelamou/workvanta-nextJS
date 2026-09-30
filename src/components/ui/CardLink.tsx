"use client";

import type { ComponentPropsWithoutRef, ElementType } from "react";
import Link from "next/link";
import { Card, type CardOwnProps } from "@/components/ui/Card";

type CardLinkProps = CardOwnProps &
    Omit<ComponentPropsWithoutRef<typeof Link>, keyof CardOwnProps>;

const LinkCard = Card as unknown as ElementType;

export function CardLink(props: CardLinkProps) {
    return <LinkCard as={Link} {...props} />;
}