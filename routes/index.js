var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/conn', function(req, res, next) {
  res.status(200).send("ok")
});

module.exports = router;
