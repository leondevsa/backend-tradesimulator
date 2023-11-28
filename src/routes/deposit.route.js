const express = require('express');
const router = express.Router();

const { DepositCtrl } = require('../controllers');

router.get('/', DepositCtrl.list);
router.get('/info', DepositCtrl.info);
router.post('/create', DepositCtrl.create);

module.exports = router;