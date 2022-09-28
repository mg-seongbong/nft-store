'use strict'

const path = require('path')
const fs = require('fs')
const debug = require('debug')('nft-store:s3conn');
const error = require('debug')('nft-store:s3conn');
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');
const allowedExtensions = ['.png', '.jpg', '.jpeg', '.bmp'];
const ROOT_FILE_PATH = '/home';
let crypto = require("crypto");

const s3 = new AWS.S3({
    accessKeyId: process.env.AWSACCESSKEY,
    secretAccessKey: process.env.AWSSECRETACCESSKEY,
    region: process.env.AWSRESION
});

Object.defineProperties(
    exports,
    {
        uploadImage : {
            value: multer({
                storage: multerS3({
                    s3 : s3,
                    bucket: process.env.AWSBUKETNAME,        
                    contentType : multerS3.AUTO_CONTENT_TYPE,
                    acl:'public-read-write',
                    key: (req, file, callback) => {            
                        let extension = path.extname(file.originalname)            
                        if(!allowedExtensions.includes(extension)) {                
                            callback(new Error('wrong extension'))
                        }else {                
                            callback(null, `images/${file.originalname}`)
                        }            
                    }
                })
            })
        },
        uploadMetadata : {
            value: (req, res, next) => {
                let buf = Buffer.from(JSON.stringify(req.body))

                let hashKey = crypto
                    .createHash("sha256")
                    .update(buf)
                    .digest("hex")
                
                let data = {
                    Bucket: process.env.AWSBUKETNAME,
                    Key: `metadata/${hashKey}.json`,
                    Body: buf,
                    ContentEncoding: 'base64',
                    ContentType: 'application/json',
                    ACL: 'public-read'
                }
                
                s3.upload(data, (err, data) => {                    
                    if(err){                        
                        res.status(400).send(err)
                    } else {                        
                        res.status(201).send(data)
                    }                    
                })
            }
        },
        readMetadata : {
            value : (req, res, next) => {
                console.error('check ' , req.query.key)
                let params = {
                    Bucket: process.env.AWSBUKETNAME,
                    Key:req.query.key
                }
                
                s3.getObject(params, (err, data) => {
                    if(err) {                
                        res.status(400).send("error!")
                    }else {                        
                        res.status(200).send((JSON.parse(data.Body.toString())))
                    }                    
                })  
            }
        },
        download : {
            value : (req, res, next) => {
                console.log(req.query.path)
                let params = {
                    Bucket: process.env.AWSBUKETNAME,
                    Key:req.query.path
                }
                debug(params)
                s3.getObject(params, (err, data) => {
                    if(err) {                        
                        res.status(400).send(err)
                    }else {                        
                        fs.writeFileSync(`${ROOT_FILE_PATH}/${req.query.path}`, data.Body)
                        res.sendStatus(200)
                    }                    
                })                
            }
        }
    }
)