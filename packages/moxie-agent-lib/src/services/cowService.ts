interface DeleteLimitOrdersRequest {
    orderUids: string[];
    signature: string;
    signingScheme: 'eip712';
}

export async function deleteLimitOrders(request: DeleteLimitOrdersRequest): Promise<void> {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            const response = await fetch(process.env.COW_API_URL + '/orders', {
                method: 'DELETE',
                headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                },
                body: JSON.stringify(request)
            });

            if (!response.ok || response.status !== 200) {
                retryCount++;
                if (retryCount === maxRetries) {
                    throw new Error(`Failed to delete orders: ${response.status}`);
                }
                // Exponential backoff: 1s, 2s, 4s
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount - 1) * 1000));
                continue;
            }

            return;
        } catch (error) {
            if (retryCount === maxRetries - 1) {
                if (error instanceof Error) {
                    throw new Error(`Failed to delete orders: ${error.message}`);
                }
                throw new Error("Failed to delete orders: An unknown error occurred");
            }
            retryCount++;
            // Exponential backoff for other errors too
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount - 1) * 1000));
        }
    }

    throw new Error("Failed to delete orders after maximum retries");
}