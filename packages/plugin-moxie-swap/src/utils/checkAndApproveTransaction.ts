import { elizaLogger, HandlerCallback } from '@elizaos/core';
import { EthereumSendTransactionInputType, PrivyClient } from '@privy-io/server-auth';
import { ethers } from 'ethers';
import { encodeFunctionData } from 'viem';

const MAX_UINT256 = BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935"); // Maximum uint256 value for unlimited approval

const ERC20_ABI = [
    {
      constant: false,
      inputs: [
        {
          name: "_spender",
          type: "address",
        },
        {
          name: "_value",
          type: "uint256",
        },
      ],
      name: "approve",
      outputs: [
        {
          name: "",
          type: "bool",
        },
      ],
      payable: false,
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      constant: true,
      inputs: [
        {
          name: "_owner",
          type: "address",
        },
        {
          name: "_spender",
          type: "address",
        },
      ],
      name: "allowance",
      outputs: [
        {
          name: "",
          type: "uint256",
        },
      ],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  ];

/**
 * Checks the allowance of a token and approves spending if necessary
 * @param moxieUserId The ID of the Moxie user making the purchase
 * @param walletAddress The address of the wallet to check allowance for
 * @param tokenAddress The address of the token to check allowance for
 * @param spenderAddress The address of the spender to check allowance for
 * @param amountInWEI The amount of tokens to check allowance for
 * @param provider The provider to use for the transaction
 * @param privyClient The Privy client to use for the transaction
 * @param callback The callback to use for the transaction
 */
export async function checkAllowanceAndApproveSpendRequest (
    moxieUserId: string,
    walletAddress: string,
    tokenAddress: string,
    spenderAddress: string,
    amountInWEI: bigint,
    provider: ethers.Provider,
    privyClient: PrivyClient,
    callback: HandlerCallback,
) {
    elizaLogger.debug(`[${moxieUserId}] [checkAllowanceAndApproveSpendRequest] called, walletAddress: ${walletAddress}, tokenAddress: ${tokenAddress}, spenderAddress: ${spenderAddress}, tokenAmount: ${amountInWEI}`)
    try {
        // First, create contract instance to check allowance
        const tokenContract = new ethers.Contract(
            tokenAddress,
            ERC20_ABI,
            provider
        );

        // Check current allowance
        const currentAllowance : bigint = await tokenContract.allowance(
            walletAddress,
            spenderAddress
        );
        elizaLogger.debug(`[${moxieUserId}] [checkAllowanceAndApproveSpendRequest] current ${spenderAddress} allowance for wallet address: ${walletAddress}, ${currentAllowance}`)

        // If allowance is already sufficient, return early
        if (currentAllowance && currentAllowance >= amountInWEI) {
            elizaLogger.debug(`[${moxieUserId}] [checkAllowanceAndApproveSpendRequest] Sufficient allowance already exists. hence no approval is required`);
            return true;
        }

        elizaLogger.debug(`[${moxieUserId}] [checkAllowanceAndApproveSpendRequest] Sufficient allowance not exists. hence proceeeding with approval is required`);
        // If we need to approve, create the approve transaction
        const approveRequestInput: EthereumSendTransactionInputType = {
            method: 'eth_sendTransaction',
            address: walletAddress,
            chainType: "ethereum",
            caip2: "eip155:" + process.env.CHAIN_ID,
            params: {
                transaction: {
                    from: walletAddress,
                    to: tokenAddress,
                    data: encodeFunctionData({
                        abi: ERC20_ABI,
                        args: [spenderAddress, MAX_UINT256],
                        functionName: "approve",
                    }),
                }
            }
        };

        elizaLogger.debug(`[${moxieUserId}] [checkAllowanceAndApproveSpendRequest] approve request: ${JSON.stringify(approveRequestInput)}`)
        const approveResponse  = await privyClient.walletApi.rpc(approveRequestInput);
        elizaLogger.debug(`[${moxieUserId}] [checkAllowanceAndApproveSpendRequest] approval txn_hash: ${JSON.stringify(approveResponse)}`)
        //@ts-ignore
        const approvalTxHash = approveResponse.data.hash
        if (callback) {
            await callback?.({
                text: `Approval transaction submitted. Awaiting confirmation.\nView on BaseScan: https://basescan.org/tx/${approvalTxHash}`,
                content: {
                    url: `https://basescan.org/tx/${approvalTxHash}`,
                }
            });
        }

        // check if the approve txn is success.
        if (approveResponse && approvalTxHash) {
            let receipt: ethers.TransactionReceipt;
            try {
                //@ts-ignore
                receipt = await provider.waitForTransaction(approvalTxHash, 1, 30000);
            } catch (error) {
                if (error.message.includes('timeout')) {
                    throw new Error('Approval transaction timed out after 30 seconds');
                }
                throw error;
            }
            elizaLogger.debug(`[${moxieUserId}] [checkAllowanceAndApproveSpendRequest] approval tx receipt: ${JSON.stringify(receipt)}`)
            if (receipt.status === 1) {
                elizaLogger.debug(`[${moxieUserId}] [checkAllowanceAndApproveSpendRequest] Approval transaction successful: ${approvalTxHash}`);
                if (callback) {
                    await callback?.({
                        text: `Approval transaction is confirmed! \nTransaction Hash: https://basescan.org/tx/${approvalTxHash}`,
                        content: {
                            url: `https://basescan.org/tx/${approvalTxHash}`,
                        }
                    });
                }
            } else {
                elizaLogger.error(`[${moxieUserId}] [checkAllowanceAndApproveSpendRequest] Approval transaction failed: ${approvalTxHash}`);
                if (callback) {
                    await callback?.({
                        text: `Approval transaction is failed! \nTransaction Hash: https://basescan.org/tx/${approvalTxHash}`,
                        content: {
                            url: `https://basescan.org/tx/${approvalTxHash}`,
                        }
                    });
                }
                throw new Error(`Approval transaction failed`);
            }
        } else {
            elizaLogger.error(`[${moxieUserId}] [checkAllowanceAndApproveSpendRequest] No transaction hash returned for approval`);
            throw new Error(`Approval transaction not initiated`);
        }

        return true;
    } catch(error) {
        elizaLogger.error(`[${moxieUserId}] [checkAllowanceAndApproveSpendRequest] error in checkAllowanceAndApproveSpendRequest, ${JSON.stringify(error)}`)
        throw error
    }

}