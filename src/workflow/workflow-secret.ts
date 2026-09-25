export const getWorkflowSecretKey = (): string => {
    const secret = process.env['HUB_MASON_WORKFLOW_SECRET_KEY'];

    if (!secret) {
        throw new Error(
            'Missing required environment variable: HUB_MASON_WORKFLOW_SECRET_KEY',
        );
    }

    return secret;
};
