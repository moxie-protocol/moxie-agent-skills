import { ethers } from "ethers";
/**
 * Fetches the symbol of an ERC20 token
 * @param tokenAddress - The token address
 * @returns Promise containing the token symbol
 * @throws Error if the contract call fails or returns invalid response
 */
export async function getERC20TokenSymbol(tokenAddress: string) {
    const abi = [
        {
          "constant": true,
          "inputs": [],
          "name": "symbol",
          "outputs": [{"name": "","type": "string"}],
          "payable": false,
          "stateMutability": "view",
          "type": "function"
        }
      ];

    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
    const contract = new ethers.Contract(tokenAddress, abi, provider);
    return await contract.symbol();
}