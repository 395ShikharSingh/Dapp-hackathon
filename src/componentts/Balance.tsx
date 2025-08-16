import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from "react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

interface TokenBalance {
    mint: string;
    name: string;
    symbol: string;
    balance: number;
    decimals: number;
}

export function Balance() {
    const { connection } = useConnection();
    const wallet = useWallet();

    const [solBalance, setSolBalance] = useState<number>(0);
    //@ts-ignore
    const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');

    const fetchBalances = async () => {
        if (!wallet.publicKey) return;
        
        setIsLoading(true);
        setErrorMessage('');
        
        try {
            const HELIUS_RPC_URL = import.meta.env.VITE_HELIUS_RPC_URL;
            
            if (!HELIUS_RPC_URL) {
                throw new Error("Helius RPC URL not found in environment variables.");
            }
            
            const heliusUrl = HELIUS_RPC_URL;

            const solBalanceLamports = await connection.getBalance(wallet.publicKey);
            const solBalanceSOL = solBalanceLamports / LAMPORTS_PER_SOL;
            setSolBalance(solBalanceSOL);

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
                            programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
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
            const tokens: TokenBalance[] = [];

            for (const account of tokenAccounts) {
                const accountInfo = account.account.data.parsed.info;
                const mint = accountInfo.mint;
                const decimals = accountInfo.tokenAmount.decimals;
                const balance = parseInt(accountInfo.tokenAmount.amount) / Math.pow(10, decimals);
                
                if (balance > 0) {
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
                    } catch (metadataError) {
                        console.log('Could not fetch metadata for token:', mint);
                    }

                    tokens.push({
                        mint: mint,
                        name: name,
                        symbol: symbol,
                        balance: balance,
                        decimals: decimals
                    });
                }
            }
            
            setTokenBalances(tokens);
        } catch (error) {
            console.error("Error fetching balances:", error);
            setErrorMessage("Failed to fetch balances.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (wallet.connected) {
            fetchBalances();
        }
    }, [wallet.publicKey, wallet.connected]);
    //@ts-ignore
    const formatBalance = (balance: number, decimals: number = 9) => {
        if (balance === 0) return '0';
        if (balance < 0.000001) return '< 0.000001';
        return balance.toFixed(6).replace(/\.?0+$/, '');
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] text-white flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-300 to-blue-500 bg-clip-text text-transparent">
                        Solana Balance
                    </h1>
                    <p className="text-white/70 mt-2">View your Solana balance</p>
                </div>

                {errorMessage && (
                    <div className="mb-6 bg-red-600/90 backdrop-blur-sm text-white p-4 rounded-lg shadow-lg border border-red-500/50">
                        <div className="flex items-center justify-between">
                            <span className="text-sm">{errorMessage}</span>
                            <button onClick={() => setErrorMessage('')} className="text-white hover:text-gray-200 ml-2">×</button>
                        </div>
                    </div>
                )}

                <div className="flex justify-center">
                    <div className="bg-gradient-to-br from-black/60 via-purple-900/40 to-black/80 backdrop-blur-xl rounded-xl p-8 shadow-2xl border border-white/20 max-w-md w-full">
                        <div className="text-center">
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-[#9945FF] via-[#14F195] to-[#9945FF] bg-clip-text text-transparent mb-6 tracking-tight">
                                Solana Balance
                            </h2>
                            {isLoading ? (
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                            ) : (
                                <div className="text-6xl font-bold mb-4">
                                    <span className="text-white tracking-tight">
                                        {formatBalance(solBalance)}
                                    </span>
                                    <span className="ml-2 bg-gradient-to-r from-[#9945FF] via-[#14F195] to-[#9945FF] bg-clip-text text-transparent tracking-wider font-black" style={{fontFamily: '"Inter", "SF Pro Display", "Helvetica Neue", system-ui, sans-serif', fontWeight: 900, letterSpacing: '0.05em'}}>
                                        SOL
                                    </span>
                                </div>
                            )}
                            <p className="text-white/80 text-lg">Available for transactions</p>
                            
                            <button 
                                onClick={fetchBalances}
                                disabled={isLoading}
                                className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-white/20 disabled:to-white/10 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent backdrop-blur-sm border border-white/20 shadow-lg"
                            >
                                {isLoading ? 'Refreshing...' : 'Refresh Balance'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}