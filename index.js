const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const serverless = require("serverless-http");

const multer = require('multer');
const upload = multer({
    storage: multer.memoryStorage()
});

const faceCompareService = require("./services/faceCompareService");
const s3 = require("./services/s3");

const path = require("path");
const moment = require("moment");


const EXPRESS_SESSION_CONFIGS = {
    secret: process.env.EXPRESS_SESSION_SECRET_KEY,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false }
};

const app = express();
app.use(cors());
app.use(session(EXPRESS_SESSION_CONFIGS));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Test route
app.get("/test", (req, res) => {
    console.log("Hello from the test route!");
    res.send("Hello from the test route!");
});

app.post("/api/compare-faces", upload.fields([{ name: 'image1' }]), async (req, res) => {
    try {
        const { fileName } = req.body;
        const { image1 } = req.files;

        if (!image1) {
            return res.status(400).json({ error: "image1 file are required." });
        }

        const  { imageData, imageUrl } = await s3.getImageFromS3(fileName, process.env.IDEAL_BUCKET_NAME);

        console.log("image1[0].buffer: ", image1[0].buffer);
        console.log("imageData.Body: ", imageData);

        const result = await faceCompareService.compareFaces(image1[0].buffer, imageData);

        const originalFileName = image1[0].originalname;  // Get the original file name
        const fileNameWithoutExt = path.parse(originalFileName).name; // Extract file name without extension
        const fileExtension = path.extname(originalFileName); // Get file extension
        const uniqueFileName = `${fileNameWithoutExt}-${moment().format("DD-MM-YYYY")}${fileExtension}`; 

        console.log("uniqueFileName: ", uniqueFileName);

        const uploadedImageUrl = await s3.uploadFileToS3(image1[0], uniqueFileName, process.env.CURRENT_BUCKET_NAME);
        if (uploadedImageUrl === "ERROR_IMAGE_URL") {
            return res.status(500).json({ error: "Failed to upload image1 to S3." });
        }

        res.status(200).json({
            message: result.message,
            match: result.match,
            idealUrl: imageUrl,
            currentUrl: uploadedImageUrl
        });
        
    } catch (error) {
        console.error("Error comparing faces:", error);
        res.status(500).json({ error: error.message || "Internal server error" });
    }
});

// to run and test locally
if (process.env.DEVELOPMENT) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server is running on PORT: ${port}.`);
    });
}
// to run over lambda
module.exports.handler = async (event, context) => {
    try {
        const path = event.path || "";
        console.log("[Lambda Handler] Requested Path -", path);

        // Forward the request to the serverless app instance
        return await serverless(app)(event, context);

    } catch (error) {
        console.error(`Lambda Handler Error: ${JSON.stringify(error)}`);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error?.message ? error.message : `Internal server error`,
            }),
        };
    }
};
