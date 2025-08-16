import { Transaction, PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { createMintToInstruction, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { useState, useEffect } from "react";

interface TokenInfo {
    mint: string;
    name: string;
    symbol: string;
    balance: number;
    hasMintAuthority: boolean;
}

export function Minting() {
    const { connection } = useConnection();
    const wallet = useWallet();

    const [userTokens, setUserTokens] = useState<TokenInfo[]>([]);
    const [selectedToken, setSelectedToken] = useState<string>('');
    const [mintAmount, setMintAmount] = useState<string>('1');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isLoadingTokens, setIsLoadingTokens] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const fetchUserTokens = async () => {
        if (!wallet.publicKey) return;
        setIsLoadingTokens(true);
        try {
            const HELIUS_RPC_URL = import.meta.env.VITE_HELIUS_RPC_URL;
            if (!HELIUS_RPC_URL) {
                throw new Error("Helius RPC URL not found in environment variables.");
            }
            const heliusUrl = HELIUS_RPC_URL;
            const response = await fetch(heliusUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 'my-id',
                    method: 'getTokenAccountsByOwner',
                    params: [
                        wallet.publicKey.toBase58(),
                        {
                            programId: TOKEN_2022_PROGRAM_ID.toBase58()
                        },
                        {
                            encoding: 'jsonParsed'
                        }
                    ]
                })
            });
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error.message);
            }
            const tokenAccounts = data.result.value;
            const tokens: TokenInfo[] = [];
            for (const account of tokenAccounts) {
                const accountInfo = account.account.data.parsed.info;
                const mint = accountInfo.mint;
                const balance = parseInt(accountInfo.tokenAmount.amount) / Math.pow(10, accountInfo.tokenAmount.decimals);
                const mintResponse = await fetch(heliusUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 'my-id',
                        method: 'getAccountInfo',
                        params: [
                            mint,
                            {
                                encoding: 'jsonParsed'
                            }
                        ]
                    })
                });
                const mintData = await mintResponse.json();
                if (mintData.result?.value) {
                    const mintInfo = mintData.result.value.data.parsed.info;
                    const hasMintAuthority = mintInfo.mintAuthority === wallet.publicKey.toBase58();
                    let name = 'Unknown Token';
                    let symbol = 'UNK';
                    try {
                        const metadataResponse = await fetch(heliusUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                jsonrpc: '2.0',
                                id: 'my-id',
                                method: 'getAsset',
                                params: [mint]
                            })
                        });
                        const metadataData = await metadataResponse.json();
                        if (metadataData.result) {
                            name = metadataData.result.content.metadata.name || 'Unknown Token';
                            symbol = metadataData.result.content.metadata.symbol || 'UNK';
                        }
                    } catch (metadataError) {}
                    tokens.push({
                        mint: mint,
                        name: name,
                        symbol: symbol,
                        balance: balance,
                        hasMintAuthority: hasMintAuthority
                    });
                }
            }
            setUserTokens(tokens);
        } catch (error) {
            setErrorMessage("Failed to fetch tokens.");
        } finally {
            setIsLoadingTokens(false);
        }
    };

    useEffect(() => {
        if (wallet.connected) {
            fetchUserTokens();
        }
    }, [wallet.publicKey, wallet.connected]);

    const handleMintMore = async () => {
        if (!wallet.publicKey || !selectedToken) {
            setErrorMessage("Please select a token and ensure wallet is connected");
            return;
        }
        const selectedTokenInfo = userTokens.find(token => token.mint === selectedToken);
        if (!selectedTokenInfo || !selectedTokenInfo.hasMintAuthority) {
            setErrorMessage("You don't have mint authority for this token");
            return;
        }
        setIsLoading(true);
        setErrorMessage('');
        try {
            const mintAmountNumber = parseInt(mintAmount);
            if (isNaN(mintAmountNumber) || mintAmountNumber <= 0) {
                throw new Error("Invalid mint amount");
            }
            const mintPublicKey = new PublicKey(selectedToken);
            const associatedToken = getAssociatedTokenAddressSync(
                mintPublicKey,
                wallet.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
            );
            const accountInfo = await connection.getAccountInfo(associatedToken);
            let transaction;
            if (!accountInfo) {
                transaction = new Transaction().add(
                    createAssociatedTokenAccountInstruction(
                        wallet.publicKey,
                        associatedToken,
                        wallet.publicKey,
                        mintPublicKey,
                        TOKEN_2022_PROGRAM_ID,
                    ),
                    createMintToInstruction(
                        mintPublicKey,
                        associatedToken,
                        wallet.publicKey,
                        mintAmountNumber * Math.pow(10, 9),
                        [],
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            } else {
                transaction = new Transaction().add(
                    createMintToInstruction(
                        mintPublicKey,
                        associatedToken,
                        wallet.publicKey,
                        mintAmountNumber * Math.pow(10, 9),
                        [],
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }
            const signature = await wallet.sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, "confirmed");
            setSuccessMessage(`Successfully minted ${mintAmount} ${selectedTokenInfo.symbol}`);
            setMintAmount('1');
            setSelectedToken('');
            await fetchUserTokens();
            setTimeout(async () => {
                await fetchUserTokens();
            }, 3000);
        } catch (error) {
            setErrorMessage("Failed to mint tokens. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const clearMessages = () => {
        setSuccessMessage('');
        setErrorMessage('');
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] text-white flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-300 to-blue-500 bg-clip-text text-transparent">
                        Mint More Tokens
                    </h1>
                    <p className="text-white/70 mt-2">Mint additional tokens for your existing collections</p>
                </div>
                {successMessage && (
                    <div className="mb-6 bg-green-600/90 backdrop-blur-sm text-white p-4 rounded-lg shadow-lg border border-green-500/50">
                        <div className="flex items-center justify-between">
                            <span className="text-sm">{successMessage}</span>
                            <button onClick={clearMessages} className="text-white hover:text-gray-200 ml-2">×</button>
                        </div>
                    </div>
                )}
                {errorMessage && (
                    <div className="mb-6 bg-red-600/90 backdrop-blur-sm text-white p-4 rounded-lg shadow-lg border border-red-500/50">
                        <div className="flex items-center justify-between">
                            <span className="text-sm">{errorMessage}</span>
                            <button onClick={clearMessages} className="text-white hover:text-gray-200 ml-2">×</button>
                        </div>
                    </div>
                )}
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 shadow-2xl border border-white/20">
                    {isLoadingTokens ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                            <p className="text-white/70">Loading your tokens...</p>
                        </div>
                    ) : userTokens.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-white/70">No tokens found. Create some tokens first!</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-white/90 mb-2">
                                    Select Token to Mint
                                </label>
                                <select
                                    value={selectedToken}
                                    onChange={(e) => setSelectedToken(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white transition-all duration-200 backdrop-blur-sm"
                                >
                                    <option value="">Choose a token...</option>
                                    {userTokens.map((token) => (
                                        <option key={token.mint} value={token.mint}>
                                            {token.name} ({token.symbol}) - Balance: {token.balance}
                                            {token.hasMintAuthority ? ' - Has Mint Authority' : ' - No Mint Authority'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/90 mb-2">
                                    Amount to Mint
                                </label>
                                <input
                                    type="number"
                                    placeholder="Enter amount"
                                    value={mintAmount}
                                    onChange={(e) => setMintAmount(e.target.value)}
                                    min="1"
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-white/50 transition-all duration-200 backdrop-blur-sm"
                                />
                            </div>
                            <button
                                onClick={handleMintMore}
                                disabled={isLoading || !selectedToken || !mintAmount}
                                className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-white/20 disabled:to-white/10 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent backdrop-blur-sm border border-white/20"
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                        Minting Tokens...
                                    </div>
                                ) : (
                                    'Mint More Tokens'
                                )}
                            </button>
                        </div>
                    )}
                </div>
                {userTokens.length > 0 && (
                    <div className="mt-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-white">Your Tokens</h2>
                            <button 
                                onClick={fetchUserTokens}
                                disabled={isLoadingTokens}
                                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-white/20 disabled:to-white/10 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent backdrop-blur-sm border border-white/20"
                            >
                                {isLoadingTokens ? 'Refreshing...' : 'Refresh'}
                            </button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {userTokens.map((token) => (
                                <div key={token.mint} className="bg-gradient-to-br from-black/60 via-purple-900/40 to-black/80 backdrop-blur-sm rounded-lg p-4 border border-white/20 shadow-lg hover:bg-gradient-to-br hover:from-black/80 hover:via-purple-800/50 hover:to-black/90 transition-all duration-300">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold text-white">{token.name}</h3>
                                        <span className="text-sm text-white/80">{token.symbol}</span>
                                    </div>
                                    <p className="text-sm text-white/90 mb-2 font-medium">Balance: {token.balance}</p>
                                    <div className="flex items-center">
                                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                                            token.hasMintAuthority 
                                                ? 'bg-green-600/90 text-white' 
                                                : 'bg-red-600/90 text-white'
                                        }`}>
                                            {token.hasMintAuthority ? 'Has Mint Authority' : 'No Mint Authority'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
