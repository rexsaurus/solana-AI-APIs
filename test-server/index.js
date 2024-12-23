const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const fs = require("fs");
const os = require("os");
require("dotenv").config();

// Load environment variables
const connection = new Connection(process.env.SOLANA_CLUSTER);

// Load wallet from environment
let wallet;
try {
  const secretKey = Uint8Array.from(JSON.parse(process.env.SECRET_KEY));
  wallet = Keypair.fromSecretKey(secretKey);
  console.log(`Monitoring wallet: ${wallet.publicKey.toBase58()}`);
} catch (error) {
  console.error("Error loading wallet:", error.message);
  process.exit(1);
}

// Helper function to extract PDA from instructions
const extractPDA = (instructions) => {
  try {
    if (!instructions || instructions.length === 0) {
      console.warn("No instructions found in the transaction.");
      return null;
    }

    for (const instruction of instructions) {
      console.log("Instruction:", instruction);

      if (instruction.programId) {
        const programId = instruction.programId.toBase58();
        const accounts = instruction.keys.map((key) => key.pubkey.toBase58());
        return { programId, accounts };
      }
    }
  } catch (error) {
    console.error("Error extracting PDA:", error.message);
  }
  return null;
};

// Function to monitor the wallet for balance changes
const monitorWallet = async (onBalanceChange) => {
  let previousBalance = await connection.getBalance(wallet.publicKey);

  console.log(`Monitoring wallet: ${wallet.publicKey.toBase58()}`);
  setInterval(async () => {
    try {
      const currentBalance = await connection.getBalance(wallet.publicKey);

      if (currentBalance !== previousBalance) {
        console.log(`Balance change detected! New balance: ${currentBalance / 1e9} SOL`);
        previousBalance = currentBalance;

        const signatures = await connection.getSignaturesForAddress(wallet.publicKey, { limit: 1 });

        if (signatures.length > 0) {
          const signature = signatures[0].signature;
          console.log(`Transaction Signature: ${signature}`);

          const transaction = await connection.getTransaction(signature, { commitment: "confirmed" });

          if (transaction && transaction.transaction) {
            const instructions = transaction.transaction.message.instructions;
            const pda = extractPDA(instructions);

            if (pda) {
              console.log("PDA extracted:", JSON.stringify(pda));
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

// Start monitoring
monitorWallet((pda) => {
  console.log("PDA changed:", pda);
});
