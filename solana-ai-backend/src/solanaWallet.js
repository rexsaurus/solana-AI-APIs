import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import { Helius } from 'helius-sdk';
import dotenv from 'dotenv';

dotenv.config();

const connection = new Connection(process.env.SOLANA_CLUSTER);
const helius = new Helius(process.env.HELIUS_API_KEY);

// Load or create a wallet
const secretKey = Uint8Array.from(JSON.parse(process.env.SECRET_KEY));
const wallet = Keypair.fromSecretKey(secretKey);

const monitorWallet = async (onBalanceChange) => {
    let previousBalance = await connection.getBalance(wallet.publicKey);

    console.log(`Monitoring wallet: ${wallet.publicKey.toBase58()}`);
    setInterval(async () => {
        const currentBalance = await connection.getBalance(wallet.publicKey);
        if (currentBalance !== previousBalance) {
            console.log(`Balance change detected. New balance: ${currentBalance / 1e9} SOL`);
            previousBalance = currentBalance;

            // Fetch transactions from the Helius API
            const transactions = await helius.getTransactions({
                accounts: [wallet.publicKey.toBase58()],
            });

            if (transactions.length) {
                const pda = extractPDA(transactions[0]);
                if (pda) {
                    console.log(`PDA content: ${JSON.stringify(pda)}`);
                    onBalanceChange(pda);
                }
            }
        }
    }, 5000); // Poll every 5 seconds
};

const extractPDA = (transaction) => {
    try {
        const instructions = transaction.transaction.message.instructions;
        const pda = instructions.find(inst => inst.programId === wallet.publicKey.toBase58());
        return pda ? JSON.parse(Buffer.from(pda.data, 'base64').toString()) : null;
    } catch (error) {
        console.error("Error extracting PDA:", error);
        return null;
    }
};

const mintTokenAndSend = async (recipient, videoUrl) => {
    // Token minting logic
    console.log(`Minting $RUNWAY token for ${recipient} with video URL: ${videoUrl}`);
    // Implement minting logic (SPL token mint and transfer) here.
};

export { wallet, monitorWallet, mintTokenAndSend };
