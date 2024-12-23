const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
require('dotenv').config();

// Load environment variables
const connection = new Connection(process.env.SOLANA_CLUSTER);
const secretKey = Uint8Array.from(JSON.parse(process.env.SECRET_KEY));
const wallet = Keypair.fromSecretKey(secretKey);

let previousBalance = 0;

console.log(`Monitoring wallet: ${wallet.publicKey.toBase58()}`);

const monitorWallet = async (onBalanceChange) => {
    let previousBalance = await connection.getBalance(wallet.publicKey);

    console.log(`Monitoring wallet: ${wallet.publicKey.toBase58()}`);
    setInterval(async () => {
        try {
            const currentBalance = await connection.getBalance(wallet.publicKey);

            if (currentBalance !== previousBalance) {
                console.log(`Balance change detected! New balance: ${currentBalance / 1e9} SOL`);
                previousBalance = currentBalance;

                // Use getSignaturesForAddress instead of the deprecated method
                const signatures = await connection.getSignaturesForAddress(wallet.publicKey, { limit: 1 });

                if (signatures.length > 0) {
                    const signature = signatures[0].signature;
                    console.log(`Transaction Signature: ${signature}`);

                    const transaction = await connection.getTransaction(signature, { commitment: "confirmed" });

                    if (transaction && transaction.meta) {
                        const pda = extractPDA(transaction.transaction.message.instructions);
                        if (pda) {
                            console.log(`PDA: ${JSON.stringify(pda)}`);
                            onBalanceChange(pda);
                        } else {
                            console.log("No PDA found in this transaction.");
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error monitoring wallet:", error.message);
        }
    }, 5000); // Poll every 5 seconds
};


const extractPDA = (instructions) => {
    try {
        for (const instruction of instructions) {
            const programId = instruction.programId.toBase58();
            const accounts = instruction.keys.map(key => key.pubkey.toBase58());
            return { programId, accounts }; // Return PDA-related info
        }
    } catch (error) {
        console.error('Error extracting PDA:', error.message);
    }
    return null;
};

// Start monitoring
monitorWallet();
