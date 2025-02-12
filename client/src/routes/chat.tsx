import { useParams } from "react-router";
import Chat from "@/components/chat";
import { UUID } from "@moxie-protocol/core";

export default function AgentRoute() {
    const { agentId } = useParams<{ agentId: UUID }>();

    if (!agentId) return <div>No data.</div>;

    return <Chat agentId={agentId} />;
}
