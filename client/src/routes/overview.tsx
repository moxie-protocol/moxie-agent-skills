import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import Overview from "@/components/overview";
import { useParams } from "react-router";
import type { UUID } from "@senpi-ai/core";

export default function AgentRoute() {
    const { agentId } = useParams<{ agentId: UUID }>();

    if (!agentId) return <div>No data.</div>;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const query = useQuery({
        queryKey: ["agent", agentId],
        queryFn: () => apiClient.getAgent(agentId),
        refetchInterval: 5_000,
    });

    const character = query?.data?.character;

    if (!character) return null;

    return <Overview character={character} />;
}
