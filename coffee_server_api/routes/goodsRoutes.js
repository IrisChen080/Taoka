const express = require('express');
const router = express.Router();
const db = require("../util/dbconfig");

/**
 * 获取全部菜单数据
 * 如果传递 store_id，则返回该门店关联的菜单信息
 */
router.get('/getData', (req, res) => {
  const { store_id } = req.query;
  
  try {
    // 基本查询所有菜单信息
    const sql = `
      SELECT g.goods_id, g.title, g.fenlei_id, g.img, g.ingredients, 
             g.taste, g.money
      FROM goods g
    `;
    
    db.query(sql, [], (err, data) => {
      if (err) {
        console.error("查询菜单失败:", err);
        return res.status(500).json({ code: 500, msg: "获取失败: " + err.message });
      }
      
      if (store_id) {
        // 如果提供了门店ID，查询该门店的库存状态
        const inventorySql = `
          SELECT goods_id, status
          FROM store_inventory
          WHERE store_id = ? AND goods_id IS NOT NULL
        `;
        
        db.query(inventorySql, [store_id], (invErr, invData) => {
          if (invErr) {
            console.error("查询库存失败:", invErr);
            return res.status(500).json({ code: 500, msg: "获取库存失败" });
          }
          
          // 查询门店信息
          const storeSql = `SELECT store_id, store_name FROM stores WHERE store_id = ?`;
          db.query(storeSql, [store_id], (storeErr, storeData) => {
            if (storeErr || storeData.length === 0) {
              console.error("查询门店失败:", storeErr);
              return res.status(500).json({ code: 500, msg: "获取门店信息失败" });
            }
            
            // 创建库存状态映射
            const statusMap = {};
            invData.forEach(item => {
              statusMap[item.goods_id] = item.status;
            });
            
            // 合并菜单和库存状态
            const result = data.map(item => ({
              ...item,
              status: statusMap[item.goods_id] || '下架',
              store_id: parseInt(store_id),
              store_name: storeData[0].store_name
            }));
            
            res.json({ list: result, code: 200, msg: "获取成功" });
          });
        });
      } else {
        // 如果没有提供门店ID，直接返回菜单数据，并设置默认值
        const result = data.map(item => ({
          ...item,
          status: '上架', // 默认状态
          store_id: 1,    // 默认门店ID
          store_name: '默认门店'
        }));
        
        res.json({ list: result, code: 200, msg: "获取成功" });
      }
    });
  } catch (e) {
    console.error("处理请求异常:", e);
    res.status(500).json({ code: 500, msg: "服务器异常: " + e.message });
  }
});
 
router.get('/withStock', (req, res) => {
  const { store_id } = req.query;
  
  try {
    // 基本查询所有菜单信息
    const sql = `
      SELECT g.goods_id, g.title, g.fenlei_id, g.img, g.ingredients, 
             g.taste, g.money
      FROM goods g 
    `;
    
    db.query(sql, [], (err, data) => {
      if (err) {
        console.error("查询菜单失败:", err);
        return res.status(500).json({ code: 500, msg: "获取失败: " + err.message });
      }
      
      if (store_id) {
        // 如果提供了门店ID，查询该门店的库存状态
        const inventorySql = `
          SELECT goods_id, status
          FROM store_inventory
          WHERE store_id = ? AND goods_id IS NOT NULL AND status = '上架'
        `;
        
        db.query(inventorySql, [store_id], (invErr, invData) => {
          if (invErr) {
            console.error("查询库存失败:", invErr);
            return res.status(500).json({ code: 500, msg: "获取库存失败" });
          }
          
          // 查询门店信息
          const storeSql = `SELECT store_id, store_name FROM stores WHERE store_id = ?`;
          db.query(storeSql, [store_id], (storeErr, storeData) => {
            if (storeErr || storeData.length === 0) {
              console.error("查询门店失败:", storeErr);
              return res.status(500).json({ code: 500, msg: "获取门店信息失败" });
            }
            
            // 创建库存状态映射
            const statusMap = {};
            invData.forEach(item => {
              statusMap[item.goods_id] = item.status;
            });
            
            // 合并菜单和库存状态
            const result = data.map(item => ({
              ...item,
              status: statusMap[item.goods_id] || '下架',
              store_id: parseInt(store_id),
              store_name: storeData[0].store_name
            }));
            
            res.json({ list: result, code: 200, msg: "获取成功" });
          });
        });
      } else {
        // 如果没有提供门店ID，直接返回菜单数据，并设置默认值
        const result = data.map(item => ({
          ...item,
          status: '上架', // 默认状态
          store_id: 1,    // 默认门店ID
          store_name: '默认门店'
        }));
        
        res.json({ list: result, code: 200, msg: "获取成功" });
      }
    });
  } catch (e) {
    console.error("处理请求异常:", e);
    res.status(500).json({ code: 500, msg: "服务器异常: " + e.message });
  }
});
/**
 * 菜单搜索接口
 * 支持通过菜单名称、原料或口味搜索
 */
router.get('/search', (req, res) => {
  const { keyword, store_id } = req.query;
  if (!keyword) return res.status(400).json({ code: 400, msg: '缺少搜索关键词' });

  try {
    const sql = `
      SELECT g.goods_id, g.title, g.fenlei_id, g.img, g.ingredients, 
             g.taste, g.money
      FROM goods g
      WHERE g.title LIKE ? OR g.ingredients LIKE ? OR g.taste LIKE ?
    `;
    
    const param = `%${keyword}%`;
    db.query(sql, [param, param, param], (err, data) => {
      if (err) {
        console.error("搜索菜单失败:", err);
        return res.status(500).json({ code: 500, msg: "搜索失败" });
      }
      
      if (store_id) {
        // 如果提供了门店ID，查询该门店的库存状态
        const inventorySql = `
          SELECT goods_id, status
          FROM store_inventory
          WHERE store_id = ? AND goods_id IS NOT NULL
        `;
        
        db.query(inventorySql, [store_id], (invErr, invData) => {
          if (invErr) {
            console.error("查询库存失败:", invErr);
            return res.status(500).json({ code: 500, msg: "获取库存失败" });
          }
          
          // 查询门店信息
          const storeSql = `SELECT store_id, store_name FROM stores WHERE store_id = ?`;
          db.query(storeSql, [store_id], (storeErr, storeData) => {
            if (storeErr || storeData.length === 0) {
              console.error("查询门店失败:", storeErr);
              return res.status(500).json({ code: 500, msg: "获取门店信息失败" });
            }
            
            // 创建库存状态映射
            const statusMap = {};
            invData.forEach(item => {
              statusMap[item.goods_id] = item.status;
            });
            
            // 合并菜单和库存状态
            const result = data.map(item => ({
              ...item,
              status: statusMap[item.goods_id] || '下架',
              store_id: parseInt(store_id),
              store_name: storeData[0].store_name
            }));
            
            res.json({ list: result, code: 200, msg: "搜索成功" });
          });
        });
      } else {
        // 如果没有提供门店ID，直接返回菜单数据，并设置默认值
        const result = data.map(item => ({
          ...item,
          status: '上架', // 默认状态
          store_id: 1,    // 默认门店ID
          store_name: '默认门店'
        }));
        
        res.json({ list: result, code: 200, msg: "搜索成功" });
      }
    });
  } catch (e) {
    console.error("处理搜索请求异常:", e);
    res.status(500).json({ code: 500, msg: "服务器异常: " + e.message });
  }
});

/**
 * 新增菜单
 * 参数：title, fenlei_id, img, ingredients, taste, money, store_id
 */
router.get('/addData', (req, res) => {
  let { title, fenlei_id, img, ingredients, taste, money, store_id } = req.query;
  
  if (!title || !fenlei_id || !img || !money || !store_id) {
    return res.status(400).json({ code: 400, msg: '缺少必要参数' });
  }

  try {
    // 确保有默认值
    ingredients = ingredients || '';
    taste = taste || '';

    const sql = `
    INSERT INTO goods (title, fenlei_id, img, ingredients, taste, money)
    VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    db.query(sql, [title, fenlei_id, img, ingredients, taste, money], (err, result) => {
      if (err) {
        console.error("添加菜单失败:", err);
        return res.status(500).json({ code: 500, msg: "添加失败" });
      }
      
      const goods_id = result.insertId;
      
      // 添加到门店库存
      const inventorySql = `
      INSERT INTO store_inventory (store_id, goods_id, stock, status)
      VALUES (?, ?, 100, '上架')
      `;
      
      db.query(inventorySql, [store_id, goods_id], (invErr) => {
        if (invErr) {
          console.error("添加库存失败:", invErr);
          return res.status(500).json({ code: 500, msg: "添加失败" });
        }
        
        res.json({ code: 200, msg: "添加成功" });
      });
    });
  } catch (e) {
    console.error("添加菜单异常:", e);
    res.status(500).json({ code: 500, msg: "服务器异常: " + e.message });
  }
});

/**
 * 修改菜单信息
 */
router.get('/updateData', (req, res) => {
  let { goods_id, title, fenlei_id, img, ingredients, taste, money } = req.query;
  
  if (!goods_id || !title || !fenlei_id || !img || !money) {
    return res.status(400).json({ code: 400, msg: '缺少必要参数' });
  }

  try {
    // 确保有默认值
    ingredients = ingredients || '';
    taste = taste || '';

    const sql = `
    UPDATE goods
    SET title = ?, fenlei_id = ?, img = ?, ingredients = ?, taste = ?, money = ?
    WHERE goods_id = ?
    `;
    
    db.query(sql, [title, fenlei_id, img, ingredients, taste, money, goods_id], (err) => {
      if (err) {
        console.error("修改菜单失败:", err);
        return res.status(500).json({ code: 500, msg: "修改失败" });
      }
      
      res.json({ code: 200, msg: "修改成功" });
    });
  } catch (e) {
    console.error("修改菜单异常:", e);
    res.status(500).json({ code: 500, msg: "服务器异常: " + e.message });
  }
});

/**
 * 更新菜单状态
 * 参数：store_id, goods_id, status
 */
router.get('/status', (req, res) => {
  const { store_id, goods_id, status } = req.query;
  
  if (!store_id || !goods_id || !status) {
    return res.status(400).json({ code: 400, msg: '缺少必要参数' });
  }

  try {
    const sql = `
    UPDATE store_inventory 
    SET status = ? 
    WHERE store_id = ? AND goods_id = ?
    `;
    
    db.query(sql, [status, store_id, goods_id], (err) => {
      if (err) {
        console.error("更新状态失败:", err);
        return res.status(500).json({ code: 500, msg: '状态更新失败' });
      }
      
      res.json({ code: 200, msg: '状态更新成功' });
    });
  } catch (e) {
    console.error("更新状态异常:", e);
    res.status(500).json({ code: 500, msg: "服务器异常: " + e.message });
  }
});

/**
 * 删除菜单
 * 参数：goods_id
 */
router.get('/delete', (req, res) => {
  const { goods_id } = req.query;
  
  if (!goods_id) {
    return res.status(400).json({ code: 400, msg: '缺少菜单ID参数' });
  }

  try {
    // 先删除库存记录
    const deleteInventorySql = `
    DELETE FROM store_inventory 
    WHERE goods_id = ?
    `;
    
    db.query(deleteInventorySql, [goods_id], (invErr) => {
      if (invErr) {
        console.error("删除库存记录失败:", invErr);
        return res.status(500).json({ code: 500, msg: '删除失败' });
      }
      
      // 再删除菜单记录
      const deleteGoodsSql = `
      DELETE FROM goods 
      WHERE goods_id = ?
      `;
      
      db.query(deleteGoodsSql, [goods_id], (err) => {
        if (err) {
          console.error("删除菜单失败:", err);
          return res.status(500).json({ code: 500, msg: '删除失败' });
        }
        
        res.json({ code: 200, msg: '删除成功' });
      });
    });
  } catch (e) {
    console.error("删除菜单异常:", e);
    res.status(500).json({ code: 500, msg: "服务器异常: " + e.message });
  }
});
// 检查商品库存
router.get('/checkStock', (req, res) => {
  const { goods_id, store_id, quantity } = req.query;
  
  if (!goods_id || !store_id) {
    return res.status(400).json({ code: 400, msg: '缺少必要参数' });
  }
  
  const sql = `
    SELECT stock, status
    FROM store_inventory
    WHERE store_id = ? AND goods_id = ?
  `;
  
  db.query(sql, [store_id, goods_id], (err, results) => {
    if (err) {
      console.error('查询库存失败:', err);
      return res.status(500).json({ code: 500, msg: '服务器错误' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ code: 404, msg: '商品不存在' });
    }
    
    const { stock, status } = results[0];
    const requestedQty = parseInt(quantity) || 1;
    
    if (status === '下架') {
      return res.status(400).json({ code: 400, msg: '商品已下架' });
    }
    
    if (stock < requestedQty) {
      return res.status(400).json({ 
        code: 400, 
        msg: '库存不足', 
        data: { 
          currentStock: stock,
          requestedQuantity: requestedQty
        }
      });
    }
    
    return res.json({ 
      code: 200, 
      msg: '库存充足', 
      data: { 
        currentStock: stock,
        requestedQuantity: requestedQty
      }
    });
  });
});
module.exports = router;