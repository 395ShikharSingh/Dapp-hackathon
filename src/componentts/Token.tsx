import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TOKEN_2022_PROGRAM_ID, createMintToInstruction, createAssociatedTokenAccountInstruction, getMintLen, createInitializeMetadataPointerInstruction, createInitializeMintInstruction, TYPE_SIZE, LENGTH_SIZE, ExtensionType, getAssociatedTokenAddressSync } from "@solana/spl-token"
import { createInitializeInstruction, pack } from '@solana/spl-token-metadata';
import { useState } from "react";


export function TokenLaunchpad() {
    const { connection } = useConnection();
    const wallet = useWallet();

    const [name, setName] = useState<string>('');
    const [symbol, setSymbol] = useState<string>('');
    const [initialSupply, setInitialSupply] = useState<string>('1');
    const [hasMintAuthority, setHasMintAuthority] = useState<boolean>(true);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    const clearForm = () => {
        setName('');
        setSymbol('');
        setInitialSupply('1');
        setHasMintAuthority(true);
        setSelectedImage(null);
        setImagePreview(null);
        setImageUrl('');
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadImageToIPFS = async (file: File): Promise<string> => {
        console.log("Processing local image...", file.name);
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                console.log("Image converted to data URL");
                resolve(dataUrl);
            };
            reader.onerror = () => {
                reject(new Error("Failed to read image file"));
            };
            reader.readAsDataURL(file);
        });
    };

    async function createToken() {
        if(!wallet.publicKey) {
            console.log("No public key")
            return;
        }
        
        setIsLoading(true);
        
        try {
            let finalImageUrl = imageUrl;
            
            if (selectedImage) {
                finalImageUrl = await uploadImageToIPFS(selectedImage);
            }
            
            const mintKeypair = Keypair.generate();
            
            const metadataJson = {
                name: name,
                symbol: symbol,
                description: `Token created with OnlyMint`,
                ...(finalImageUrl && { image: finalImageUrl }),
                attributes: [
                    {
                        trait_type: "Created At",
                        value: new Date().toISOString()
                    }
                ]
            };

            const metadata = {
                mint: mintKeypair.publicKey,
                name: name,
                symbol: symbol,
                uri: 'https://cdn.100xdevs.com/metadata.json', 
                additionalMetadata: [
                    ['description', `Token created with OnlyMint`] as const,
                    ...(finalImageUrl ? [['image', finalImageUrl] as const] : []),
                    ['created_at', new Date().toISOString()] as const,
                ],
            };

            const mintLen = getMintLen([ExtensionType.MetadataPointer]);
            const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

            const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

            const transaction = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: wallet.publicKey,
                    newAccountPubkey: mintKeypair.publicKey,
                    space: mintLen,
                    lamports,
                    programId: TOKEN_2022_PROGRAM_ID,
                }),
                createInitializeMetadataPointerInstruction(mintKeypair.publicKey, wallet.publicKey, mintKeypair.publicKey, TOKEN_2022_PROGRAM_ID),
                createInitializeMintInstruction(
                    mintKeypair.publicKey, 
                    9, 
                    wallet.publicKey, 
                    null, 
                    TOKEN_2022_PROGRAM_ID
                ),
                createInitializeInstruction({
                    programId: TOKEN_2022_PROGRAM_ID,
                    mint: mintKeypair.publicKey,
                    metadata: mintKeypair.publicKey,
                    name: metadata.name,
                    symbol: metadata.symbol,
                    uri: metadata.uri,
                    mintAuthority: wallet.publicKey,
                    updateAuthority: wallet.publicKey,
                }),
            );
                
            transaction.feePayer = wallet.publicKey;
            transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            transaction.partialSign(mintKeypair);

            await wallet.sendTransaction(transaction, connection);

            console.log(`Token mint created at ${mintKeypair.publicKey.toBase58()}`);
            const associatedToken = getAssociatedTokenAddressSync(
                mintKeypair.publicKey,
                wallet.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
            );

            console.log(associatedToken.toBase58());

            const transaction2 = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    wallet.publicKey,
                    associatedToken,
                    wallet.publicKey,
                    mintKeypair.publicKey,
                    TOKEN_2022_PROGRAM_ID,
                ),
            );

            await wallet.sendTransaction(transaction2, connection);

            if (hasMintAuthority) {
                const transaction3 = new Transaction().add(
                        createMintToInstruction(
                            mintKeypair.publicKey, 
                            associatedToken, 
                            wallet.publicKey, 
                            parseInt(initialSupply) * Math.pow(10, 9), 
                            [], 
                            TOKEN_2022_PROGRAM_ID
                        )
                );
                await wallet.sendTransaction(transaction3, connection);
            }

            console.log("Minted!")
            console.log("Token created successfully:", mintKeypair.publicKey.toBase58());
            console.log("Metadata:", metadataJson);
            
            setSuccessMessage(`Token "${name}" created successfully! Mint: ${mintKeypair.publicKey.toBase58()}`);
            
            clearForm();
            
            setTimeout(() => {
                setSuccessMessage('');
            }, 5000);
            
        } catch (error) {
            console.error("Error creating token:", error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] text-white flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {successMessage && (
                    <div className="mb-6 bg-green-600/90 backdrop-blur-sm text-white p-4 rounded-lg shadow-lg border border-green-500/50">
                        <div className="flex items-center justify-between">
                            <span className="text-sm">{successMessage}</span>
                            <button 
                                onClick={() => setSuccessMessage('')}
                                className="text-white hover:text-gray-200 ml-2"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                )}
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 shadow-2xl border border-white/20">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                Token Name
                            </label>
                            <input 
                                type="text" 
                                placeholder="Enter token name" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-white/50 transition-all duration-200 backdrop-blur-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                Token Symbol
                            </label>
                            <input 
                                type="text" 
                                placeholder="Enter token symbol" 
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value)}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-white/50 transition-all duration-200 backdrop-blur-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                Token Image
                            </label>
                            
                            {imagePreview && (
                                <div className="mb-3">
                                    <img 
                                        src={imagePreview} 
                                        alt="Token preview" 
                                        className="w-20 h-20 object-cover rounded-lg border border-white/20"
                                    />
                                </div>
                            )}
                            
                            <div className="space-y-2">
                                <label className="flex items-center justify-center w-full h-12 px-4 transition bg-white/10 border-2 border-white/20 border-dashed rounded-lg appearance-none cursor-pointer hover:border-blue-400 focus:outline-none">
                                    <span className="flex items-center space-x-2 text-white/70">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                        </svg>
                                        <span className="font-medium">Upload Image</span>
                                    </span>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                </label>
                                
                                <div className="text-center">
                                    <span className="text-white/50 text-sm">or</span>
                                </div>
                                
                                <input 
                                    type="text" 
                                    placeholder="Enter image URL" 
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-white/50 transition-all duration-200 backdrop-blur-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                Initial Supply
                            </label>
                            <input 
                                type="text" 
                                placeholder="Enter initial supply" 
                                value={initialSupply}
                                onChange={(e) => setInitialSupply(e.target.value)}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-white/50 transition-all duration-200 backdrop-blur-sm"
                            />
                        </div>

                        <div>
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={hasMintAuthority} 
                                    onChange={(e) => setHasMintAuthority(e.target.checked)}
                                    className="w-4 h-4 text-blue-400 bg-white/10 border-white/20 rounded focus:ring-blue-400 focus:ring-2"
                                />
                                <span className="text-sm text-white/80">Has Mint Authority (Initial Supply)</span>
                            </label>
                        </div>

                        <button 
                            onClick={createToken} 
                            disabled={isLoading || !name || !symbol}
                            className="w-full mt-6 px-6 py-3 bg-black/80 hover:bg-black/90 disabled:bg-white/10 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-transparent backdrop-blur-sm border border-white/20 shadow-lg"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    Creating Token...
                                </div>
                            ) : (
                                'Create Token'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}