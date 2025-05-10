const express = require('express');
const router = express.Router();
const db = require("../util/dbconfig");

// 获取所有门店列表
router.get('/getStores', (req, res) => {
  const sql = "SELECT store_id, store_name, address, phone, opening_hours, status, daily_sales, monthly_sales FROM stores";
  db.query(sql, (err, results) => {
    if (err) {
      console.error('获取门店列表失败:', err);
      return res.status(500).json({
        code: 500,
        msg: "服务器内部错误",
        data: null
      });
    }
    res.json({
      code: 200,
      msg: "success",
      data: results
    });
  });
});

// 获取单个门店详情
router.get('/getStore/:storeId', (req, res) => {
  const storeId = parseInt(req.params.storeId);
  
  if (isNaN(storeId)) {
    return res.status(400).json({
      code: 400,
      msg: "无效的门店ID参数",
      data: null
    });
  }

  const sql = `
    SELECT store_id, store_name, address, phone, 
           opening_hours, status, daily_sales, monthly_sales 
    FROM stores 
    WHERE store_id = ?
  `;

  db.query(sql, [storeId], (err, results) => {
    if (err) {
      console.error('门店详情查询失败:', err);
      return res.status(500).json({
        code: 500,
        msg: "服务器内部错误",
        data: null
      });
    }
    
    if (results.length === 0) {
      return res.status(404).json({
        code: 404,
        msg: "未找到指定门店",
        data: null
      });
    }

    res.json({
      code: 200,
      msg: "success",
      data: results[0]
    });
  });
});

// 修改门店信息（使用预处理语句）
router.post('/updateStore', (req, res) => {
  const { store_id, ...updateData } = req.body;

  const sql = `
    UPDATE stores SET 
      store_name = ?,
      address = ?,
      phone = ?,
      opening_hours = ?,
      status = ?,
      daily_sales = ?,
      monthly_sales = ?
    WHERE store_id = ?
  `;

  const params = [
    updateData.store_name,
    updateData.address,
    updateData.phone,
    updateData.opening_hours,
    updateData.status,
    updateData.daily_sales,
    updateData.monthly_sales,
    store_id
  ];

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('修改门店失败:', err);
      return res.status(500).json({
        code: 500,
        msg: "更新操作失败",
        data: null
      });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        msg: "未找到指定门店",
        data: null
      });
    }

    res.json({
      code: 200,
      msg: "门店信息更新成功",
      data: result
    });
  });
});

// 添加门店（POST方法更规范）
router.post('/addStore', (req, res) => {
  const newStore = req.body;
  
  const sql = `
    INSERT INTO stores 
      (store_name, address, phone, opening_hours, status, daily_sales, monthly_sales)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    newStore.store_name,
    newStore.address,
    newStore.phone,
    newStore.opening_hours,
    newStore.status || '营业中',
    newStore.daily_sales || 0,
    newStore.monthly_sales || 0
  ];

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('添加门店失败:', err);
      return res.status(500).json({
        code: 500,
        msg: "创建门店失败",
        data: null
      });
    }
    
    res.status(201).json({
      code: 201,
      msg: "门店创建成功",
      data: {
        store_id: result.insertId,
        ...newStore
      }
    });
  });
});

// 设置营业状态（改为POST方法）
router.post('/setStoreStatus', (req, res) => {
  const { store_id, status } = req.body;

  const sql = `
    UPDATE stores 
    SET status = ? 
    WHERE store_id = ?
  `;

  db.query(sql, [status, store_id], (err, result) => {
    if (err) {
      console.error('状态更新失败:', err);
      return res.status(500).json({
        code: 500,
        msg: "状态更新失败",
        data: null
      });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        msg: "未找到指定门店",
        data: null
      });
    }

    res.json({
      code: 200,
      msg: "营业状态更新成功",
      data: result
    });
  });
});

module.exports = router;