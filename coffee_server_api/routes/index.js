const express = require('express');
const router = express.Router();

// 引入各个模块路由
const userRoutes = require('./userRoutes');
const productRoutes = require('./productRoutes');
const orderRoutes = require('./orderRoutes');
const commentRoutes = require('./commentRoutes');
const starRoutes = require('./starRoutes');
const categoryRoutes = require('./categoryRoutes');
const storeRoutes = require('./storeRoutes');
const staffRoutes = require('./staffRoutes');
const lotteryRoutes = require('./lotteryRoutes');
const noticeRoutes = require('./noticeRoutes');
const goodsRoutes = require('./goodsRoutes');

// 注册各个模块路由
router.use('/user', userRoutes);
router.use('/product', productRoutes);
router.use('/order', orderRoutes);
router.use('/comment', commentRoutes);
router.use('/star', starRoutes);
router.use('/category', categoryRoutes);
router.use('/store', storeRoutes);
router.use('/staff', staffRoutes);
router.use('/lottery', lotteryRoutes);
router.use('/notice', noticeRoutes);
router.use('/goods', goodsRoutes);

module.exports = router;
