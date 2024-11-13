const faceapi = require("face-api.js");
const canvas = require("canvas");

const { Canvas, Image, ImageData } = canvas;

// Configure face-api.js to use canvas in Node.js
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const MODELS_PATH = './models';

// Load models needed for face detection and recognition
async function loadModels() {
    await faceapi.nets.tinyFaceDetector.loadFromDisk(MODELS_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH);
    console.log("Face models loaded.");
}

// Load and resize image from buffer
async function loadImageFromBuffer(buffer) {
    const img = await canvas.loadImage(buffer);
    const resizedImage = canvas.createCanvas(320, 240);
    const context = resizedImage.getContext("2d");
    context.drawImage(img, 0, 0, 320, 240);
    return resizedImage;
}

// Compare faces in two image buffers
async function compareFaces(buffer1, buffer2) {
    await loadModels();
    const img1 = await loadImageFromBuffer(buffer1);
    const img2 = await loadImageFromBuffer(buffer2);

    // Detect faces
    const detections1 = await faceapi.detectAllFaces(img1, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
    const detections2 = await faceapi.detectAllFaces(img2, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();

    if (!detections1.length || !detections2.length) {
        throw new Error("One of the images does not contain a face.");
    }

    const distance = faceapi.euclideanDistance(detections1[0].descriptor, detections2[0].descriptor);
    const threshold = 0.6; // Similarity threshold
    const match = distance <= threshold;
    const accuracy = Math.max(0, (1 - distance) * 100);

    return {
        distance,
        match,
        accuracy,
        message: match ? "Faces look the same." : "Faces look different."
    };
}

module.exports = {
    compareFaces
};
