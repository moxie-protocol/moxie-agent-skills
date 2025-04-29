
export const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
export const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
export const ETH_TOKEN_DECIMALS = 18;
export const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const USDC_TOKEN_DECIMALS = 6;
export const USDC = "USDC"
export const MOXIE = "MOXIE"
export const MOXIE_TOKEN_ADDRESS = process.env.MOXIE_TOKEN_ADDRESS;
export const MOXIE_TOKEN_DECIMALS = 18;
export const TRANSACTION_RECEIPT_TIMEOUT = 60000;
export const subjectSharePurchasedTopic0 = "0x96c1b5a0ee3c1932c831b8c6a559c93b48a3109915784a05ff44a07cc09c3931"
export const subjectShareSoldTopic0 = "0x44ebb8a56b0413525e33cc89179d9758b2b1ab944b0bbeeb6d119adb2a6e3fe2"
export const ERC20_TXN_SLIPPAGE_BPS = 100; // 1% slippage (100 basis points = 1%)
export const BASE_NETWORK_ID = 8453;

export const BONDING_CURVE_ABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_subject",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "_subjectTokenAmount",
                "type": "uint256"
            }
        ],
        "name": "calculateTokensForBuy",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "moxieAmount_",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "protocolFee_",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "subjectFee_",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_subject",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "_subjectTokenAmount",
                "type": "uint256"
            }
        ],
        "name": "calculateTokensForSell",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "moxieAmount_",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "protocolFee_",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "subjectFee_",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "_subject",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "_depositAmount",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "_minReturnAmountAfterFee",
                type: "uint256",
            },
            {
                internalType: "address",
                name: "_orderReferrer",
                type: "address",
            },
        ],
        name: "buySharesV2",
        outputs: [
            {
                internalType: "uint256",
                name: "shares_",
                type: "uint256",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "_subject",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "_sellAmount",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "_minReturnAmountAfterFee",
                type: "uint256",
            },
            {
                internalType: "address",
                name: "_orderReferrer",
                type: "address",
            },
        ],
        name: "sellSharesV2",
        outputs: [
            {
                internalType: "uint256",
                name: "returnAmount_",
                type: "uint256",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "_subject",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "_sellToken",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "_sellAmount",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "_spender",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "_buyToken",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "_buyAmount",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "_beneficiary",
                "type": "address"
            }
        ],
        "name": "SubjectSharePurchased",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "_subject",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "_sellToken",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "_sellAmount",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "_spender",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "_buyToken",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "_buyAmount",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "_beneficiary",
                "type": "address"
            }
        ],
        "name": "SubjectShareSold",
        "type": "event"
    }
];