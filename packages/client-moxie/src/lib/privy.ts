import { PrivyClient } from "@privy-io/server-auth";
import { PRIVY_APP_ID, PRIVY_APP_SECRET } from "../constants/constants";

export const privyClient = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);