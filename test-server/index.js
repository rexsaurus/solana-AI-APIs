const { Connection, Keypair, PublicKey, Transaction, SystemProgram, TransactionInstruction } = require("@solana/web3.js");
const fs = require("fs");
const os = require("os");
require("dotenv").config();

// Load environment variables
const connection = new Connection(process.env.SOLANA_CLUSTER);

// Load wallet
let wallet;
try {
  const secretKey = Uint8Array.from(JSON.parse(process.env.SECRET_KEY));
  wallet = Keypair.fromSecretKey(secretKey);
  console.log(`Monitoring wallet: ${wallet.publicKey.toBase58()}`);
} catch (error) {
  console.error("Error loading wallet:", error.message);
  process.exit(1);
}

// Function to monitor the wallet for balance changes and extract memo data
const monitorWallet = async () => {
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

          if (transaction && transaction.transaction && transaction.transaction.message) {
            const memo = extractMemo(transaction.transaction.message.instructions);
            if (memo) {
              console.log("Memo found in transaction:", memo);
            } else {
              console.log("No memo found in this transaction.");
            }
          } else {
            console.log("Transaction data is incomplete or not yet confirmed.");
          }
        }
      }
    } catch (error) {
      console.error("Error monitoring wallet:", error.message);
    }
  }, 5000); // Poll every 5 seconds
};

const extractMemo = (instructions) => {
    try {
      if (!instructions || instructions.length === 0) {
        console.warn("No instructions found in the transaction.");
        return null;
      }
  
      const memoProgramId = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"; // Memo program ID
      for (const instruction of instructions) {
        // Match the instruction's program ID with the Memo program
        if (instruction.programId.toBase58() === memoProgramId) {
          // Decode the memo data from the instruction's data field
          const memoData = instruction.data.length
            ? Buffer.from(instruction.data).toString("utf8")
            : null;
  
          console.log("Found memo instruction:", memoData); // Debug log
          return memoData;
        }
      }
    } catch (error) {
      console.error("Error extracting memo:", error.message);
    }
    return null;
  };
  
  

const createTestTransaction = async (recipientPublicKey) => {
    try {
      console.log("Creating a test transaction...");
  
      // Data to store in the memo field
      const memoData = JSON.stringify({
        endpoint: "/runwayml",
        operation: "image-to-video",
        url: "https://example.com/image.png",
        duration: "5s",
      });
      console.log("Memo Data (JSON):", memoData); // Debug log
  
      // Create the transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: new PublicKey(recipientPublicKey),
        lamports: 0.1 * 1e9, // Convert SOL to lamports
      });
  
      // Create the memo instruction
      const memoInstruction = new TransactionInstruction({
        keys: [],
        programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
        data: Buffer.from(memoData, "utf8"), // Serialize JSON in memo
      });
  
      // Create and sign the transaction
      const transaction = new Transaction().add(transferInstruction, memoInstruction);
      console.log("Transaction Instructions:", transaction.instructions); // Debug log
      transaction.feePayer = wallet.publicKey;
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.sign(wallet);
  
      // Send the transaction
      const signature = await connection.sendTransaction(transaction, [wallet]);
      console.log("Transaction sent. Signature:", signature);
  
      // Confirm the transaction
      const confirmedTransaction = await connection.getTransaction(signature, { commitment: "confirmed" });
      if (confirmedTransaction) {
        const memo = extractMemo(confirmedTransaction.transaction.message.instructions);
        if (memo) {
          console.log("Memo stored in transaction:", memo);
        } else {
          console.log("No memo found in the confirmed transaction.");
        }
      } else {
        console.log("Transaction is not yet confirmed or data is incomplete.");
      }
    } catch (error) {
      console.error("Error creating or sending transaction:", error.message);
    }
  };
  

// Main Execution
(async () => {
  const recipientPublicKey = process.env.RECIPIENT_WALLET;

  if (!recipientPublicKey) {
    console.error("Error: No recipient wallet address specified in .env");
    process.exit(1);
  }

  // Create a test transaction with a memo
  await createTestTransaction(recipientPublicKey);

  // Start monitoring wallet for memo data
  monitorWallet();
})();
