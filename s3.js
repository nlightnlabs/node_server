import { createRequire } from "module";
const require = createRequire(import.meta.url);

const aws = require('aws-sdk')
const dotenv =require('dotenv')
const crypto = require('crypto')
const { promisify } =require('util');
const randomBytes = promisify(crypto.randomBytes)

dotenv.config();

async function generateUploadURL(filePath){

  // S3 Bucket access
  const region = "us-west-1"
  const bucketName = "nlightnlabs01"
  const accessKeyId = process.env.AWS_S3_ACCESS_KEY
  const secretAccessKey = process.env.AWS_S3_SECRET_KEY


  const s3 = new aws.S3({
    region,
    accessKeyId,
    secretAccessKey,
    signatureVersion: 'v4'
  })

    const rawBytes = await randomBytes(16)
    // const fileName = rawBytes.toString('hex')
  
    const params = ({
        Bucket: bucketName,
        Key: filePath,
        Expires: 60
    })

    const uploadURL = await s3.getSignedUrlPromise('putObject', params)
    return uploadURL

}

module.exports = {generateUploadURL}