'use strict'
const express = require('express');
const router = express.Router();
const s3conn = require('../modules').s3conn;
const debug = require('debug')('nft-store:uploader');

router.post('/upload-image', s3conn.uploadImage.single('uploadfile'), (req, res, next) => {        
    debug(req.file)

    let filePath = req.file.location
    
    if(!filePath) {
        res.status(403).send("Invalid file path")
    } else {
        res.status(201).send(req.file);
    }
});

router.post('/upload-metadata', s3conn.uploadMetadata);

router.post('/read-metadata', s3conn.readMetadata);

module.exports = router;