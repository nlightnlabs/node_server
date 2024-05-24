// convert "require" to import for ES
import { createRequire } from "module";
const require = createRequire(import.meta.url);

//Import environment evariables
const dotenv = require('dotenv')
dotenv.config();
console.log(process.env.NODE_ENV)

const aws = require('aws-sdk')

const x = async (req, res)=>{
    try{   

        // AWS S3  access
        const region = "us-west-1"
        const accessKeyId = process.env.AWS_S3_ACCESS_KEY
        const secretAccessKey = process.env.AWS_S3_SECRET_KEY
        const s3 = new aws.S3({
            region,
            accessKeyId,
            secretAccessKey,
            signatureVersion: 'v4'
        })

        const response = await s3.listObjectsV2({
            Bucket: "nlightnlabs01"
        }).promise();

        console.log(response)
        
    }catch(error){
        console.log(error)
    }
}
x()