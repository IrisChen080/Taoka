const express = require('express');
const router = express.Router();
const db = require("../util/dbconfig");

// 获取所有商品基本信息（不含库存状态）
router.get('/getProducts', (req, res) => {
  const { store_id } = req.query;
  if (!store_id) return res.status(400).json({ code: 400, msg: '需要店铺ID参数' });

  const sql = `
    SELECT 
      p.product_id AS id,
      p.name,
      p.price,
      p.image,
      p.description,
      si.stock,
      si.status,
      s.store_name
    FROM products p
    JOIN store_inventory si ON p.product_id = si.product_id
    LEFT JOIN stores s ON s.store_id = si.store_id
    WHERE si.store_id = ? 
    AND si.product_id IS NOT NULL
  `;

  db.query(sql, [store_id], (err, results) => {
    if (err) return handleError(res, err);
    res.json({ code: 200, data: results });
  });
});

// 获取商品库存信息（需指定店铺）
router.get('/inventory', (req, res) => {
  const { store_id } = req.query;
  if (!store_id) return res.status(400).json({ code: 400, msg: '需要店铺ID参数' });

  const sql = `
    SELECT 
      p.product_id,
      p.name,
      si.stock,
      si.status
    FROM products p
    JOIN store_inventory si ON p.product_id = si.product_id
    WHERE si.store_id = ?
  `;
  db.query(sql, [store_id], (err, results) => {
    if (err) return handleError(res, err);
    res.json({ code: 200, data: results });
  });
});

// 获取陶瓷商品库存信息
router.get('/withStock', (req, res) => {
  const { store_id } = req.query;
  if (!store_id) return res.status(400).json({ code: 400, msg: '需要店铺ID参数' });

  const sql = `
    SELECT 
      p.product_id AS id,
      p.name,
      p.price,
      p.image,
      p.description,
      si.stock,
      si.status,
      s.store_name
    FROM products p
    JOIN store_inventory si ON p.product_id = si.product_id
    LEFT JOIN stores s ON s.store_id = si.store_id
    WHERE si.store_id = ? 
    AND si.product_id IS NOT NULL AND si.status = '上架'
  `;

  db.query(sql, [store_id], (err, results) => {
    if (err) return handleError(res, err);
    res.json({ code: 200, data: results });
  });
});

// 搜索商品
router.get('/search', (req, res) => {
  const { keyword, store_id } = req.query;
  if (!keyword) return res.status(400).json({ code: 400, msg: '缺少搜索关键词' });
  if (!store_id) return res.status(400).json({ code: 400, msg: '需要店铺ID参数' });

  const sql = `
    SELECT 
      p.product_id AS id,
      p.name,
      p.price,
      p.image,
      p.description,
      si.stock,
      si.status,
      s.store_name
    FROM products p
    JOIN store_inventory si ON p.product_id = si.product_id
    LEFT JOIN stores s ON s.store_id = si.store_id
    WHERE si.store_id = ?
    AND (p.name LIKE ? OR p.description LIKE ?)
  `;

  const param = `%${keyword}%`;
  db.query(sql, [store_id, param, param], (err, results) => {
    if (err) return handleError(res, err);
    res.json({ code: 200, data: results });
  });
});

// 新增商品（基础信息）
router.get('/add', (req, res) => {
  const { name, price, image, description, store_id, stock = 100, status = '上架' } = req.query;
  
  if (!name || !price || !image || !description || !store_id) {
    return res.status(400).json({ code: 400, msg: '缺少必要参数' });
  }

  const sql = `
    INSERT INTO products (name, price, image, description)
    VALUES (?, ?, ?, ?)
  `;
  db.query(sql, [name, price, image, description], (err, results) => {
    if (err) return handleError(res, err, '创建失败');
    
    const productId = results.insertId;
    
    // 初始化库存
    const inventorySql = `
      INSERT INTO store_inventory 
      (store_id, product_id, stock, status)
      VALUES (?, ?, ?, ?)
    `;
    
    db.query(inventorySql, [store_id, productId, stock, status], (err) => {
      if (err) return handleError(res, err, '库存初始化失败');
      res.json({ code: 201, msg: '创建成功' });
    });
  });
});

// 更新商品基础信息
router.get('/edit', (req, res) => {
  const { id, name, price, image, description, stock, status } = req.query;
  
  if (!id || !name || !price || !image || !description) {
    return res.status(400).json({ code: 400, msg: '缺少必要参数' });
  }

  const sql = `
    UPDATE products
    SET name = ?, price = ?, image = ?, description = ?
    WHERE product_id = ?
  `;
  
  db.query(sql, [name, price, image, description, id], (err) => {
    if (err) return handleError(res, err, '更新基本信息失败');
    
    // 如果提供了库存参数，则更新库存
    if (stock !== undefined) {
      const updateStockSql = `
        UPDATE store_inventory
        SET stock = ?
        WHERE product_id = ?
      `;
      
      db.query(updateStockSql, [stock, id], (err) => {
        if (err) return handleError(res, err, '更新库存失败');
        
        // 库存为0时自动下架
        if (parseInt(stock) === 0) {
          updateStatus(id, '下架', res);
        } else if (status) {
          updateStatus(id, status, res);
        } else {
          res.json({ code: 200, msg: '更新成功' });
        }
      });
    } else {
      res.json({ code: 200, msg: '更新成功' });
    }
  });
});

// 更新库存状态（需指定店铺）
router.get('/status', (req, res) => {
  const { store_id, product_id, status } = req.query;
  if (!store_id) return res.status(400).json({ code: 400, msg: '需要店铺ID参数' });
  if (!product_id) return res.status(400).json({ code: 400, msg: '需要商品ID参数' });
  if (!status) return res.status(400).json({ code: 400, msg: '需要状态参数' });

  // 如果是上架状态，检查库存
  if (status === '上架') {
    const checkStockSql = `
      SELECT stock 
      FROM store_inventory 
      WHERE store_id = ? AND product_id = ?
    `;
    
    db.query(checkStockSql, [store_id, product_id], (err, results) => {
      if (err) return handleError(res, err, '查询库存失败');
      
      if (results.length === 0) {
        return res.status(404).json({ code: 404, msg: '找不到该商品的库存记录' });
      }
      
      const stock = results[0].stock;
      if (stock <= 0) {
        return res.status(400).json({ code: 400, msg: '库存为0，不能上架' });
      }
      
      updateStatus(product_id, status, res, store_id);
    });
  } else {
    updateStatus(product_id, status, res, store_id);
  }
});

// 删除商品
router.get('/delete', (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ code: 400, msg: '需要商品ID参数' });

  // 先删除库存记录
  const deleteInventorySql = `
    DELETE FROM store_inventory
    WHERE product_id = ?
  `;
  
  db.query(deleteInventorySql, [id], (err) => {
    if (err) return handleError(res, err, '删除库存记录失败');
    
    // 再删除商品记录
    const deleteProductSql = `
      DELETE FROM products
      WHERE product_id = ?
    `;
    
    db.query(deleteProductSql, [id], (err) => {
      if (err) return handleError(res, err, '删除商品失败');
      res.json({ code: 200, msg: '删除成功' });
    });
  });
});

// 辅助函数 - 更新状态
function updateStatus(productId, status, res, storeId = null) {
  let sql, params;
  
  if (storeId) {
    sql = `
      UPDATE store_inventory 
      SET status = ?
      WHERE product_id = ? AND store_id = ?
    `;
    params = [status, productId, storeId];
  } else {
    sql = `
      UPDATE store_inventory 
      SET status = ?
      WHERE product_id = ?
    `;
    params = [status, productId];
  }
  
  db.query(sql, params, (err) => {
    if (err) return handleError(res, err, '状态更新失败');
    res.json({ code: 200, msg: '状态更新成功' });
  });
}

// 统一错误处理
function handleError(res, err, msg = '服务器错误') {
  console.error('SQL Error:', err);
  return res.status(500).json({
    code: 500,
    msg,
    error: process.env.NODE_ENV === 'development' ? err.message : null
  });
}
// 更新商品库存（减少库存）
router.post('/updateStock', (req, res) => {
  const { product_id, store_id, quantity } = req.body;
  
  if (!product_id || !store_id || !quantity) {
    return res.status(400).json({ 
      code: 400, 
      msg: '缺少必要参数' 
    });
  }
  
  // 查询当前库存
  const checkStockSql = `
    SELECT stock 
    FROM store_inventory 
    WHERE store_id = ? AND product_id = ?
  `;
  
  db.query(checkStockSql, [store_id, product_id], (err, results) => {
    if (err) {
      console.error('查询库存失败:', err);
      return res.status(500).json({ 
        code: 500, 
        msg: '服务器错误' 
      });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ 
        code: 404, 
        msg: '找不到该商品的库存记录' 
      });
    }
    
    const currentStock = results[0].stock;
    
    // 确保库存足够
    if (currentStock < quantity) {
      return res.status(400).json({ 
        code: 400, 
        msg: '库存不足' 
      });
    }
    
    // 更新库存
    const newStock = currentStock - quantity;
    const updateStockSql = `
      UPDATE store_inventory 
      SET stock = ?
      WHERE store_id = ? AND product_id = ?
    `;
    
    db.query(updateStockSql, [newStock, store_id, product_id], (err) => {
      if (err) {
        console.error('更新库存失败:', err);
        return res.status(500).json({ 
          code: 500, 
          msg: '更新库存失败' 
        });
      }
      
      // 如果新库存为0，自动更新商品状态为"下架"
      if (newStock === 0) {
        const updateStatusSql = `
          UPDATE store_inventory 
          SET status = '下架'
          WHERE store_id = ? AND product_id = ?
        `;
        
        db.query(updateStatusSql, [store_id, product_id], (err) => {
          if (err) {
            console.error('更新商品状态失败:', err);
            // 虽然状态更新失败，但库存更新成功，仍返回成功
          }
        });
      }
      
      return res.json({ 
        code: 200, 
        msg: '库存更新成功', 
        data: { 
          productId: product_id, 
          storeId: store_id, 
          newStock: newStock 
        }
      });
    });
  });
});
module.exports = router;