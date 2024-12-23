const { Connection, Keypair, Transaction, SystemProgram, PublicKey } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");
const os = require("os");
require("dotenv").config();

// Load environment variables
const connection = new Connection(process.env.SOLANA_CLUSTER);

// Validate and load test wallet
let testWalletKeypair;
try {
  const testWalletPath = process.env.TEST_WALLET_PATH.replace("~", os.homedir());
  testWalletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(testWalletPath, "utf-8")))
  );
  console.log("Test wallet loaded successfully:", testWalletKeypair.publicKey.toBase58());
} catch (error) {
  console.error("Error loading test wallet:", error.message);
  throw error;
}

// Validate recipient wallet
let recipient;
try {
  recipient = new PublicKey(process.env.RECIPIENT_WALLET);
  console.log("Recipient wallet is valid:", recipient.toBase58());
} catch (error) {
  console.error("Invalid recipient wallet address:", process.env.RECIPIENT_WALLET);
  throw error;
}

// Create and send a test transaction
(async () => {
  try {
    console.log("Creating a test transaction...");

    // Create the transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: testWalletKeypair.publicKey,
      toPubkey: recipient,
      lamports: 0.1 * 1e9, // Convert SOL to lamports
    });

    // Create and sign the transaction
    const transaction = new Transaction().add(transferInstruction);
    transaction.feePayer = testWalletKeypair.publicKey;
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.sign(testWalletKeypair);

    // Send the transaction
    const signature = await connection.sendTransaction(transaction, [testWalletKeypair]);
    console.log("Transaction sent. Signature:", signature);

    // Confirm the transaction
    const confirmation = await connection.confirmTransaction(signature, "confirmed");
    console.log("Transaction confirmed:", confirmation);
  } catch (error) {
    console.error("Error creating or sending transaction:", error.message);
  }
})();
