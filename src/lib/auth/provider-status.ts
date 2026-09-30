export type OAuthProvider = "GitHub" | "Google";

export type OAuthStatus =
    | "connected"
    | "already-connected"
    | "already-used"
    | "invalid"
    | "expired"
    | "config-error"
    | "token-error"
    | "user-error"
    | "link-error";

export type ProviderAlert = {
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
    duration: number;
};

export function getProviderStatus(
    provider: OAuthProvider,
    status?: string,
): ProviderAlert | null {
    if (!status) {
        return null;
    }

    const messages: Record<OAuthStatus, ProviderAlert> = {
        connected: {
            variant: "success",
            title: `${provider} connected`,
            message: `Your ${provider} account has been successfully connected to your Workvanta account.`,
            duration: 5000,
        },

        "already-connected": {
            variant: "info",
            title: `${provider} already connected`,
            message: `This ${provider} account is already connected to your Workvanta account.`,
            duration: 5000,
        },

        "already-used": {
            variant: "error",
            title: `${provider} account already in use`,
            message: `This ${provider} account is already connected to another Workvanta account. Please use a different ${provider} account.`,
            duration: 7000,
        },

        invalid: {
            variant: "error",
            title: `Invalid ${provider} connection`,
            message: `The ${provider} connection could not be verified. Please try connecting again.`,
            duration: 6000,
        },

        expired: {
            variant: "warning",
            title: `${provider} connection expired`,
            message: `Your ${provider} connection request expired. Please try again.`,
            duration: 6000,
        },

        "config-error": {
            variant: "error",
            title: `${provider} configuration error`,
            message: `${provider} account linking is not configured correctly. Please contact support.`,
            duration: 8000,
        },

        "token-error": {
            variant: "error",
            title: `${provider} authorization failed`,
            message: `Workvanta could not complete the ${provider} authorization. Please try again.`,
            duration: 6000,
        },

        "user-error": {
            variant: "error",
            title: `Could not retrieve ${provider} account`,
            message: `Workvanta could not retrieve your ${provider} account information. Please try again.`,
            duration: 6000,
        },

        "link-error": {
            variant: "error",
            title: `Could not connect ${provider}`,
            message: `Something went wrong while connecting your ${provider} account. Please try again.`,
            duration: 6000,
        },
    };

    if (!(status in messages)) {
        return null;
    }

    return messages[status as OAuthStatus];
}
