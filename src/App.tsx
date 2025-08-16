import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
    WalletModalProvider,
    WalletDisconnectButton,
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { TokenLaunchpad } from "./componentts/Token";
import { Minting } from "./componentts/Minting";
import { Balance } from "./componentts/Balance";
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import './App.css'

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [mintDone, setMintDone] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('mint');
  const { connected } = useWallet();

  const renderMainContent = () => {
    switch (activeTab) {
      case 'mint':
        return <TokenLaunchpad />;
      case 'swap':
        return (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-4">Token Swap</h2>
              <p className="text-white/70">Swap functionality coming soon...</p>
            </div>
          </div>
        );
      case 'balance':
        return <Balance />;
      case 'minting':
        return <Minting />;
      default:
        return <TokenLaunchpad />;
    }
  };

  return (
    <ConnectionProvider endpoint={"https://api.devnet.solana.com"}>
      <WalletProvider wallets={[]} autoConnect>
          <WalletModalProvider>
                <div className="min-h-screen relative overflow-hidden">
                    {/* Beautiful Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 via-blue-900/20 to-blue-800/30 to-white/5"></div>
                    
                    {/* Animated Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10 animate-pulse"></div>
                    
                    {/* Subtle Grid Pattern */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
                    
                    {/* Header */}
                    <header className="relative z-50 bg-white/5 backdrop-blur-xl border-b border-white/10">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex items-center justify-between h-16">
                                {/* Logo */}
                                <div className="flex items-center">
                                    <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-300 to-blue-500 bg-clip-text text-transparent">
                                        OnlyMint
                                    </h1>
                                </div>

                                {/* Navigation */}
                                <nav className="hidden md:flex items-center space-x-8">
                                    <button
                                        onClick={() => setActiveTab('mint')}
                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 cursor-pointer ${
                                            activeTab === 'mint'
                                                ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-white/20'
                                                : 'text-white/70 hover:text-white hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 hover:border hover:border-white/10'
                                        }`}
                                    >
                                        Mint
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('swap')}
                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 cursor-pointer ${
                                            activeTab === 'swap'
                                                ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-white/20'
                                                : 'text-white/70 hover:text-white hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 hover:border hover:border-white/10'
                                        }`}
                                    >
                                        Swap
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('balance')}
                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 cursor-pointer ${
                                            activeTab === 'balance'
                                                ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-white/20'
                                                : 'text-white/70 hover:text-white hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 hover:border hover:border-white/10'
                                        }`}
                                    >
                                        Balance
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('minting')}
                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 cursor-pointer ${
                                            activeTab === 'minting'
                                                ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-white/20'
                                                : 'text-white/70 hover:text-white hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 hover:border hover:border-white/10'
                                        }`}
                                    >
                                        Token
                                    </button>
                                </nav>

                                {/* Wallet Buttons */}
                                <div className="flex items-center gap-2">
                                    <WalletMultiButton className="!bg-white/10 hover:!bg-white/20 !text-white !font-semibold !rounded-lg !px-4 !py-2 !border !border-white/20 backdrop-blur-sm" />
                                    {connected && (
                                        <WalletDisconnectButton className="!bg-white/10 hover:!bg-white/20 !text-white !font-semibold !rounded-lg !px-4 !py-2 !border !border-white/20 backdrop-blur-sm" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </header>
                    
                    {/* Main Content */}
                    <main className="relative z-10 pt-8">
                        {renderMainContent()}
                    </main>
                    
                    {/* Token Success Message */}
                    {token && (
                        <div className="fixed bottom-4 left-4 right-4 bg-green-600/90 backdrop-blur-sm text-white p-4 rounded-lg shadow-lg border border-green-500/50 z-50">
                            <div className="flex items-center justify-between">
                                <span>Token created successfully: {token}</span>
                                <button 
                                    onClick={() => setToken(null)}
                                    className="text-white hover:text-gray-200"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </WalletModalProvider>
        </WalletProvider>
    </ConnectionProvider>
  )
}

export default App
