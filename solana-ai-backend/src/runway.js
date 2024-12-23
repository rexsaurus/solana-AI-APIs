const RunwayML = require('@runwayml/sdk');
require('dotenv').config();

const runwayClient = new RunwayML({
    apiKey: process.env.RUNWAYML_API_SECRET,
});

const createVideo = async (imageUrl, promptText) => {
    try {
        const response = await runwayClient.imageToVideo.create({
            model: 'stable-diffusion',
            promptImage: imageUrl,
            promptText,
        });

        const taskId = response.id;
        let task;

        console.log(`Task created: ${taskId}`);
        do {
            await new Promise(resolve => setTimeout(resolve, 5000));
            task = await runwayClient.tasks.retrieve(taskId);
            console.log(`Task progress: ${task.progress || task.status}`);
        } while (task.status !== 'SUCCEEDED' && task.status !== 'FAILED');

        if (task.status === 'SUCCEEDED') {
            console.log(`Task completed. Video URL: ${task.output[0]}`);
            return task.output[0];
        } else {
            throw new Error('Video creation failed.');
        }
    } catch (error) {
        console.error('Error creating video:', error.message);
        throw error;
    }
};

module.exports = { createVideo };
