const aws = require('aws-sdk');

// Configure AWS SDK with your AWS credentials
aws.config.update({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    region: process.env.REGION
});

const s3 = new aws.S3();

module.exports.uploadFileToS3 = async (file, fileName, bucketName) => {
    try {  
        // Create S3 object parameters (adjust ACL as needed)
        const params = {
            Bucket: bucketName,  
            Key: fileName,  
            Body: file.buffer,  
        };

        // Upload the file to S3
        const output = await s3.upload(params).promise();

        console.log(`[uploadImageToS3] Single Image output : ${JSON.stringify(output)}`)

        // Generate the uploaded image URL
        const imageUrl = output.Location;

        return imageUrl;
    } catch (error) {
        console.error(`[uploadImageToS3] Error occurred: ${error}`);
        return "ERROR_IMAGE_URL";
    }
};


module.exports.getImageFromS3 = async (fileName, bucketName) => {
    try {
        // Create S3 getObject parameters
        const params = {
            Bucket: bucketName,
            Key: fileName,
        };

        // Retrieve the file from S3
        const output = await s3.getObject(params).promise();

        console.log(`[getImageFromS3] Retrieved Image: ${fileName} from ${bucketName}`);

        // The output Body contains the binary data of the image
        const imageData = output.Body; 

        // Get the public URL (or a signed URL if the object is private)
        const imageUrl = `https://${bucketName}.s3.${process.env.REGION}.amazonaws.com/${fileName}`;


        return {
            imageData,
            imageUrl
        };

    } catch (error) {
        console.error(`[getImageFromS3] Error occurred: ${error}`);
        return null; // Handle error accordingly
    }
};
