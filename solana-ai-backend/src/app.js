const express = require('express');
const dotenv = require('dotenv');
const { monitorWallet, mintTokenAndSend } = require('./solanaWallet');
const { createVideo } = require('./runway');

dotenv.config();
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Monitor wallet for balance changes
monitorWallet(async (pda) => {
    const { originatingWallet, api_request, imageUrl, promptText } = pda;
    console.log(`Originating Wallet: ${originatingWallet}`);
    console.log(`API Request: ${JSON.stringify(api_request)}`);

    try {
        const videoUrl = await createVideo(imageUrl, promptText);
        await mintTokenAndSend(originatingWallet, videoUrl);
        console.log(`Token minted and video URL sent to ${originatingWallet}`);
    } catch (error) {
        console.error('Error processing balance change:', error.message);
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.send('Solana-Runway Server is running!');
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
