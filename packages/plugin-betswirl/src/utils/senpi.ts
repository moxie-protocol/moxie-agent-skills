import { CasinoChainId, Token, casinoChainById } from "@betswirl/sdk-core";

export function formatTokenForSenpiTerminal(
    chainId: CasinoChainId,
    token: Token
) {
    const casinoChain = casinoChainById[chainId];
    return token.symbol === casinoChain.viemChain.nativeCurrency.symbol
        ? token.symbol
        : `$[${token.symbol}\\|${token.address}]`;
}
