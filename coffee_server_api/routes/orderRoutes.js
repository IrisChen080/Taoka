const express = require('express');
const router = express.Router();
const db = require("../util/dbconfig");

// 获取所有订单 - 管理后台使用，保留原有功能
router.get('/getDingdan', (req, res) => {
  // 如果提供了tel参数，则按电话筛选（为管理后台搜索功能）
  const { tel } = req.query;
  let sql = 'SELECT * FROM dingdan';
  let params = [];
  
  if (tel) {
    sql += ' WHERE tel = ?';
    params.push(tel);
  }
  
  // 添加排序，让最新订单显示在前
  sql += ' ORDER BY dingdan_id DESC';
  
  db.query(sql, params, (err, data) => {
    if (err) {
      console.log(err);
      return res.json({
        code: 500,
        msg: '获取失败'
      })
    } else {
      res.send({
        list: data,
        code: 200,
        msg: "获取成功"
      });
    }
  })
});

// 订单创建路由：处理批量订单创建，更新销售额和减少库存
router.get('/addDingdan', (req, res) => {
  try {
    // 解析请求参数
    let dingdanArr;
    try {
      dingdanArr = JSON.parse(req.query.dingdanArr);
    } catch (e) {
      // 如果已经是对象，则直接使用
      dingdanArr = req.query.dingdanArr;
    }
    
    // 确保dingdanArr是数组
    const arr = Array.isArray(dingdanArr) ? dingdanArr : [];
    const { tel, bianhao, isTakeout, store_id } = req.query;
    
    // 记录详细日志
    console.log("订单参数:", {
      dingdanArr: JSON.stringify(arr),
      tel, bianhao, isTakeout, store_id
    });
    
    // 参数校验
    if (arr.length === 0 || !tel || !bianhao || !store_id) {
      return res.status(400).json({ code: 400, msg: '缺少必要参数或订单为空' });
    }
    
    // 验证店铺是否在营业状态
    verifyStoreStatus(store_id, (storeError, storeStatus) => {
      if (storeError) {
        return res.status(500).json({ code: 500, msg: '无法验证门店状态' });
      }
      
      if (storeStatus !== '营业中') {
        return res.status(400).json({ code: 400, msg: '提交失败，门店已歇业' });
      }
      
      // 预检查库存
      checkInventory(arr, store_id, (inventoryErr, insufficientItems) => {
        if (inventoryErr && insufficientItems.length > 0) {
          return res.status(400).json({ 
            code: 400, 
            msg: '以下商品库存不足: ' + insufficientItems.map(item => item.title).join(', ') 
          });
        }
        
        // 获取商品的正确ID映射关系
        getCorrectItemIdMappings(arr, store_id, (mappingErr, itemMappings) => {
          if (mappingErr) {
            return res.status(500).json({ code: 500, msg: '商品ID映射失败' });
          }
          
          // 为了调试，输出所有商品映射信息
          console.log("商品ID映射:", itemMappings);
          
          // 计算总销售额
          const totalAmount = arr.reduce((sum, item) => {
            return sum + (parseFloat(item.money) * (parseInt(item.shopNum) || 1));
          }, 0);
          
          // 创建订单记录 - 传入商品ID映射
          createOrders(arr, tel, bianhao, isTakeout, store_id, itemMappings, (orderError, orderData) => {
            if (orderError) {
              console.error("订单创建失败:", orderError);
              return res.status(500).json({ code: 500, msg: '订单创建失败: ' + orderError.message });
            }
            
            // 更新门店销售额
            updateStoreSales(store_id, totalAmount, (salesError) => {
              if (salesError) {
                console.error("更新销售额失败:", salesError);
                // 继续处理，不影响订单创建
              }
              
              // 更新商品库存 - 传入商品ID映射
              updateInventory(arr, store_id, itemMappings, (inventoryError) => {
                if (inventoryError) {
                  console.error("库存更新失败:", inventoryError);
                  // 继续处理，不影响订单创建和销售额更新
                }
                
                // 返回成功响应
                res.json({ msg: '订单提交成功!', code: 200 });
              });
            });
          });
        });
      });
    });
  } catch (error) {
    console.error("处理订单请求异常:", error);
    res.status(400).json({ code: 400, msg: '无效的订单数据: ' + error.message });
  }
});

// 验证门店状态
function verifyStoreStatus(storeId, callback) {
  const sql = `SELECT status FROM stores WHERE store_id = ?`;
  
  db.query(sql, [storeId], (err, results) => {
    if (err) {
      console.error("查询门店状态失败:", err);
      return callback(err);
    }
    
    if (results.length === 0) {
      return callback(new Error("门店不存在"));
    }
    
    callback(null, results[0].status);
  });
}

// 获取所有商品的正确ID映射
function getCorrectItemIdMappings(items, storeId, callback) {
  const itemMappings = [];
  let pendingMappings = items.length;
  let hasErrors = false;
  
  if (items.length === 0) {
    return callback(null, []);
  }
  
  items.forEach((item, index) => {
    // 判断商品类型
    determineProductType(item, (typeErr, itemType) => {
      if (typeErr) {
        hasErrors = true;
        pendingMappings--;
        return;
      }
      
      if (itemType === 'ceramic') {
        // 陶瓷商品 - 查找正确的 product_id
        findCorrectProductId(item, storeId, (findErr, productId) => {
          if (findErr) {
            console.error(`无法找到陶瓷商品 "${item.title}" 的正确ID:`, findErr);
            hasErrors = true;
          } else {
            itemMappings[index] = {
              originalItem: item,
              idField: 'product_id',
              itemId: productId,
              type: 'ceramic'
            };
          }
          
          pendingMappings--;
          checkComplete();
        });
      } else {
        // 咖啡商品 - 直接使用 goods_id
        itemMappings[index] = {
          originalItem: item,
          idField: 'goods_id',
          itemId: item.goods_id,
          type: 'coffee'
        };
        
        pendingMappings--;
        checkComplete();
      }
    });
  });
  
  function checkComplete() {
    if (pendingMappings === 0) {
      callback(hasErrors ? new Error("部分商品ID映射失败") : null, itemMappings);
    }
  }
}

// 判断商品类型
function determineProductType(item, callback) {
  // 根据标题判断是否为陶瓷商品
  const isCeramicByTitle = item.title && (
    item.title.includes('陶瓷') || 
    item.title.includes('瓷') || 
    item.title.includes('杯') || 
    item.title.includes('茶叶罐') || 
    item.title.includes('花瓶') ||
    item.title.includes('冰箱贴')
  );
  
  // 如果是陶瓷商品
  if (isCeramicByTitle) {
    return callback(null, 'ceramic');
  }
  
  // 默认为咖啡商品
  return callback(null, 'coffee');
}

// 查找陶瓷商品的正确 product_id
function findCorrectProductId(item, storeId, callback) {
  // 如果已经有 product_id 且不为 null，直接使用
  if (item.product_id && item.product_id !== null) {
    return callback(null, item.product_id);
  }
  
  // 根据标题查询 products 表
  const searchSql = `
    SELECT p.product_id 
    FROM products p
    JOIN store_inventory si ON p.product_id = si.product_id
    WHERE p.name LIKE ? AND si.store_id = ?
    LIMIT 1
  `;
  
  // 构建模糊搜索条件
  const searchTitle = '%' + item.title + '%';
  
  db.query(searchSql, [searchTitle, storeId], (err, results) => {
    if (err) {
      console.error(`查询商品 "${item.title}" 失败:`, err);
      return callback(err);
    }
    
    if (results.length > 0) {
      // 找到匹配的商品
      return callback(null, results[0].product_id);
    }
    
    // 没有找到匹配的商品，尝试使用商品ID作为product_id
    // 这种情况通常在前端数据结构不一致时发生
    if (item.goods_id) {
      const checkProductSql = `
        SELECT product_id 
        FROM products 
        WHERE product_id = ?
        LIMIT 1
      `;
      
      db.query(checkProductSql, [item.goods_id], (checkErr, checkResults) => {
        if (checkErr || checkResults.length === 0) {
          // 如果商品ID也不存在于products表中，使用某个默认ID
          console.warn(`无法根据标题或ID找到陶瓷商品 "${item.title}"，使用默认ID=1`);
          return callback(null, 1);
        }
        
        // 使用商品ID作为product_id
        callback(null, item.goods_id);
      });
    } else {
      // 最后的备选方案：使用默认ID
      console.warn(`无法为陶瓷商品 "${item.title}" 找到正确的ID，使用默认ID=1`);
      callback(null, 1);
    }
  });
}

// 检查库存
function checkInventory(items, storeId, callback) {
  const insufficientItems = [];
  let pendingChecks = items.length;
  
  if (items.length === 0) {
    return callback(null, []);
  }
  
  items.forEach(item => {
    // 判断商品类型
    determineProductType(item, (typeErr, itemType) => {
      if (typeErr) {
        pendingChecks--;
        return;
      }
      
      let idField = itemType === 'ceramic' ? 'product_id' : 'goods_id';
      let itemId = idField === 'product_id' ? 
        (item.product_id || findProductIdByTitle(item.title)) : 
        item.goods_id;
      const quantity = parseInt(item.shopNum) || 1;
      
      // 查询库存
      const checkSql = `
        SELECT stock, status 
        FROM store_inventory 
        WHERE store_id = ? AND ${idField} = ?
      `;
      
      db.query(checkSql, [storeId, itemId], (err, results) => {
        pendingChecks--;
        
        if (err) {
          console.error(`检查商品库存失败: ${idField}=${itemId}`, err);
        } else if (results.length === 0) {
          console.error(`商品不存在于库存: ${idField}=${itemId}`);
          insufficientItems.push(item);
        } else if (results[0].status === '下架') {
          console.error(`商品已下架: ${idField}=${itemId}`);
          insufficientItems.push(item);
        } else if (results[0].stock < quantity && idField === 'product_id') {
          // 只对陶瓷商品严格检查库存
          console.error(`商品库存不足: ${idField}=${itemId}, 需要=${quantity}, 实际=${results[0].stock}`);
          insufficientItems.push(item);
        }
        
        // 所有检查完成后返回结果
        if (pendingChecks === 0) {
          callback(insufficientItems.length > 0, insufficientItems);
        }
      });
    });
  });
}

// 根据标题查找可能的 product_id
function findProductIdByTitle(title) {
  // 常见陶瓷商品与ID的映射表
  const ceramicProductMapping = {
    '景德镇手工陶瓷杯': 1,
    '复古陶瓷茶叶罐': 2,
    '陶瓷杯': 1,
    '创意陶瓷冰箱贴': 4,
    '青花瓷花瓶': 5,
    '咖啡陶瓷杯套装': 6
  };
  
  // 尝试精确匹配
  if (ceramicProductMapping[title]) {
    return ceramicProductMapping[title];
  }
  
  // 尝试部分匹配
  for (const [key, id] of Object.entries(ceramicProductMapping)) {
    if (title.includes(key)) {
      return id;
    }
  }
  
  // 默认返回ID 1
  return 1;
}

// 创建订单
function createOrders(items, tel, bianhao, isTakeout, storeId, itemMappings, callback) {
  let completedOrders = 0;
  let errors = [];
  const createdOrders = [];
  
  if (items.length === 0) {
    return callback(null, []);
  }
  
  items.forEach((item, index) => {
    // 使用商品ID映射信息
    const mapping = itemMappings[index];
    // 如果没有映射，使用原始商品ID
    const itemId = mapping ? mapping.itemId : item.goods_id;
    
    const sql = `
      INSERT INTO dingdan(
        goods_id, shopNum, title, img, ingredients, money, 
        tel, bianhao, isTakeout, store_id
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.query(sql, [
      itemId, 
      item.shopNum || 1, 
      item.title, 
      item.img,
      item.ingredients || '', 
      item.money, 
      tel, 
      bianhao, 
      isTakeout, 
      storeId
    ], (err, result) => {
      completedOrders++;
      
      if (err) {
        console.error("订单创建失败:", err);
        errors.push(err);
      } else {
        createdOrders.push({
          id: result.insertId,
          item: item,
          mapping: mapping
        });
      }
      
      if (completedOrders === items.length) {
        callback(errors.length > 0 ? new Error("部分订单创建失败") : null, createdOrders);
      }
    });
  });
}

// 更新库存
function updateInventory(items, storeId, itemMappings, callback) {
  let pendingUpdates = items.length;
  let errors = [];
  
  if (pendingUpdates === 0) {
    return callback(null);
  }
  
  items.forEach((item, index) => {
    // 使用商品ID映射信息
    const mapping = itemMappings[index];
    if (!mapping) {
      console.error(`商品 "${item.title}" 没有ID映射信息`);
      pendingUpdates--;
      errors.push(new Error(`商品 "${item.title}" 没有ID映射信息`));
      return;
    }
    
    const idField = mapping.idField;
    const itemId = mapping.itemId;
    const quantity = parseInt(item.shopNum) || 1;
    
    console.log(`尝试更新库存: ${idField}=${itemId}, 商品=${item.title}, 数量=${quantity}`);
    
    // 更新库存
    const updateSql = `
      UPDATE store_inventory 
      SET stock = CASE 
          WHEN stock >= ? THEN stock - ?
          ELSE 0
        END
      WHERE store_id = ? AND ${idField} = ?
    `;
    
    db.query(updateSql, [quantity, quantity, storeId, itemId], (err) => {
      pendingUpdates--;
      
      if (err) {
        console.error(`更新库存失败: ${idField}=${itemId}`, err);
        errors.push(err);
      } else {
        console.log(`成功更新库存: ${idField}=${itemId}, 减少=${quantity}`);
        
        // 检查并处理库存为0的情况
        checkAndUpdateItemStatus(storeId, idField, itemId);
      }
      
      if (pendingUpdates === 0) {
        callback(errors.length > 0 ? new Error("部分库存更新失败") : null);
      }
    });
  });
}

// 检查并更新商品状态（库存为0时自动下架）
function checkAndUpdateItemStatus(storeId, idField, itemId) {
  const checkSql = `
    SELECT stock FROM store_inventory 
    WHERE store_id = ? AND ${idField} = ?
  `;
  
  db.query(checkSql, [storeId, itemId], (err, results) => {
    if (err || results.length === 0) {
      return;
    }
    
    const stock = results[0].stock;
    
    // 如果库存为0，自动下架
    if (stock === 0) {
      const updateStatusSql = `
        UPDATE store_inventory 
        SET status = '下架' 
        WHERE store_id = ? AND ${idField} = ?
      `;
      
      db.query(updateStatusSql, [storeId, itemId], (statusErr) => {
        if (statusErr) {
          console.error(`更新商品状态失败: ${idField}=${itemId}`, statusErr);
        } else {
          console.log(`商品库存为0，已自动下架: ${idField}=${itemId}`);
        }
      });
    }
  });
}

// 更新门店销售额
function updateStoreSales(storeId, amount, callback) {
  const updateSql = `
    UPDATE stores 
    SET daily_sales = daily_sales + ?, 
        monthly_sales = monthly_sales + ? 
    WHERE store_id = ?
  `;
  
  db.query(updateSql, [amount, amount, storeId], (err) => {
    if (err) {
      console.error(`更新门店销售额失败: storeId=${storeId}, amount=${amount}`, err);
    } else {
      console.log(`成功更新门店销售额: storeId=${storeId}, amount=${amount}`);
    }
    callback(err);
  });
}

// 订单删除路由 - 增加取消订单时恢复库存和销售额功能
router.get('/delOrder', (req, res) => {
  const { dingdan_id } = req.query;
  if (!dingdan_id) return res.status(400).json({ code: 400, msg: '缺少订单ID' });

  // 首先获取订单信息，以便后续恢复库存和销售额
  const getOrderSql = `SELECT * FROM dingdan WHERE dingdan_id = ?`;
  
  db.query(getOrderSql, [dingdan_id], (getErr, orderData) => {
    if (getErr || orderData.length === 0) {
      console.error("获取订单信息失败:", getErr);
      return res.status(500).json({ code: 500, msg: "删除失败，无法获取订单信息" });
    }

    const order = orderData[0];
    const storeId = order.store_id;
    const goodsId = order.goods_id;
    const title = order.title;
    const quantity = parseInt(order.shopNum) || 1;
    const amount = parseFloat(order.money) * quantity;

    // 执行删除订单
    db.query(`DELETE FROM dingdan WHERE dingdan_id = ?`, [dingdan_id], (delErr) => {
      if (delErr) {
        console.error("删除订单失败:", delErr);
        return res.status(500).json({ code: 500, msg: "删除失败" });
      }

      // 创建一个模拟商品对象用于确定类型
      const itemForTypeCheck = { title: title, goods_id: goodsId };
      
      // 确定商品类型
      determineProductType(itemForTypeCheck, (typeErr, productType) => {
        if (typeErr) {
          console.error("确定商品类型失败:", typeErr);
          return res.json({ code: 200, msg: "删除成功，但库存恢复失败" });
        }
        
        // 确定正确的字段名和商品ID
        const idField = productType === 'ceramic' ? 'product_id' : 'goods_id';
        
        // 对于陶瓷商品，查找正确的ID
        if (productType === 'ceramic') {
          findCorrectProductId(itemForTypeCheck, storeId, (findErr, productId) => {
            if (findErr) {
              console.error("查找陶瓷商品ID失败:", findErr);
              return res.json({ code: 200, msg: "删除成功，但库存恢复失败" });
            }
            
            // 恢复库存
            restoreInventory(storeId, idField, productId, quantity, (invErr) => {
              if (invErr) {
                console.error("恢复库存失败:", invErr);
              }
              
              // 恢复销售额
              restoreSales(storeId, amount, (salesErr) => {
                if (salesErr) {
                  console.error("恢复销售额失败:", salesErr);
                }
                
                res.json({ code: 200, msg: "删除成功，库存和销售额已恢复" });
              });
            });
          });
        } else {
          // 对于咖啡商品，直接使用goods_id
          restoreInventory(storeId, idField, goodsId, quantity, (invErr) => {
            if (invErr) {
              console.error("恢复库存失败:", invErr);
            }
            
            // 恢复销售额
            restoreSales(storeId, amount, (salesErr) => {
              if (salesErr) {
                console.error("恢复销售额失败:", salesErr);
              }
              
              res.json({ code: 200, msg: "删除成功，库存和销售额已恢复" });
            });
          });
        }
      });
    });
  });
});

// 恢复库存
function restoreInventory(storeId, idField, itemId, quantity, callback) {
  console.log(`尝试恢复库存: storeId=${storeId}, ${idField}=${itemId}, quantity=${quantity}`);
  
  const updateSql = `
    UPDATE store_inventory 
    SET 
      stock = stock + ?,
      status = CASE 
        WHEN status = '下架' AND stock + ? > 0 THEN '上架'
        ELSE status
      END
    WHERE store_id = ? AND ${idField} = ?
  `;
  
  db.query(updateSql, [quantity, quantity, storeId, itemId], (err, result) => {
    if (err) {
      console.error(`恢复库存失败: ${idField}=${itemId}`, err);
    } else if (result.affectedRows === 0) {
      console.error(`恢复库存失败: 找不到商品 ${idField}=${itemId}`);
    } else {
      console.log(`成功恢复库存: ${idField}=${itemId}, 增加=${quantity}`);
    }
    callback(err);
  });
}

// 恢复销售额
function restoreSales(storeId, amount, callback) {
  const updateSql = `
    UPDATE stores 
    SET 
      daily_sales = GREATEST(0, daily_sales - ?),
      monthly_sales = GREATEST(0, monthly_sales - ?)
    WHERE store_id = ?
  `;
  
  db.query(updateSql, [amount, amount, storeId], (err) => {
    if (err) {
      console.error(`恢复销售额失败: storeId=${storeId}, amount=${amount}`, err);
    } else {
      console.log(`成功恢复销售额: storeId=${storeId}, amount=${amount}`);
    }
    callback(err);
  });
}

// 用户订单查询路由 - 小程序端使用
router.get('/myDingdan', (req, res) => {
  const { tel } = req.query;
  if (!tel) return res.status(400).json({ code: 400, msg: '缺少电话号码参数' });

  // 添加明确的排序，确保最新订单显示在前面
  db.query(`SELECT * FROM dingdan WHERE tel = ? ORDER BY dingdan_id DESC`, [tel], (err, data) => {
    if (err) {
      console.error("查询用户所有订单失败:", err);
      return res.status(500).json({ code: 500, msg: '获取失败' });
    }
    res.json({ list: data, code: 200, msg: "获取成功" });
  });
});

// 订单基本信息修改路由
router.get('/updateOrder', (req, res) => {
  const { dingdan_id, tel, shopNum, money } = req.query;
  if (!dingdan_id || !tel || !shopNum || !money) {
    return res.status(400).json({ code: 400, msg: '缺少必要参数' });
  }

  db.query(`UPDATE dingdan SET tel=?, shopNum=?, money=? WHERE dingdan_id=?`, 
    [tel, shopNum, money, dingdan_id], (err) => {
      if (err) return res.status(500).json({ msg: "修改失败", code: 500 });
      res.json({ msg: "修改成功", code: 200 });
  });
});

// 订单评价状态更新路由
router.get('/xgOrderStar', (req, res) => {
  const { dingdan_id } = req.query;
  if (!dingdan_id) return res.status(400).json({ code: 400, msg: '缺少订单ID' });

  db.query(`UPDATE dingdan SET active='1' WHERE dingdan_id=?`, [dingdan_id], (err) => {
    if (err) return res.status(500).json({ msg: "修改失败", code: 500 });
    res.json({ msg: "修改成功", code: 200 });
  });
});

// 订单出餐状态更新路由
router.get('/updateChucan', (req, res) => {
  const { dingdan_id } = req.query;
  if (!dingdan_id) return res.status(400).json({ code: 400, msg: '缺少订单ID' });

  db.query(`UPDATE dingdan SET is_chucan='1' WHERE dingdan_id=?`, [dingdan_id], (err) => {
    if (err) return res.status(500).json({ msg: "修改失败", code: 500 });
    res.json({ msg: "修改成功", code: 200 });
  });
});

// 订单确认状态更新路由
router.get('/updateQueren', (req, res) => {
  const { dingdan_id } = req.query;
  if (!dingdan_id) return res.status(400).json({ code: 400, msg: '缺少订单ID' });

  // 先获取订单信息，查找用户手机号
  db.query(`SELECT tel FROM dingdan WHERE dingdan_id=?`, [dingdan_id], (telErr, telResult) => {
    if (telErr) {
      console.error("获取订单用户失败:", telErr);
      return res.status(500).json({ msg: "修改失败", code: 500 });
    }
    
    if (telResult.length === 0) {
      return res.status(404).json({ msg: "订单不存在", code: 404 });
    }
    
    const userTel = telResult[0].tel;
    
    // 更新订单为已确认状态
    db.query(`UPDATE dingdan SET is_queren='1' WHERE dingdan_id=?`, [dingdan_id], (err) => {
      if (err) return res.status(500).json({ msg: "修改失败", code: 500 });
      
      // 更新会员等级 - 根据订单次数
      updateMemberLevelByOrders(userTel);
      
      res.json({ msg: "修改成功", code: 200 });
    });
  });
});

// 根据订单次数自动更新会员等级
function updateMemberLevelByOrders(tel) {
  // 统计用户所有订单数量 - 修改为计算所有订单，不仅仅是已确认的
  const countSql = `
    SELECT COUNT(*) as orderCount 
    FROM dingdan 
    WHERE tel = ?
  `;
  
  db.query(countSql, [tel], (err, countResult) => {
    if (err || countResult.length === 0) {
      console.error("统计用户订单失败:", err);
      return;
    }
    
    const orderCount = countResult[0].orderCount;
    let newLevel = '普通';
    
    // 根据订单数量确定会员等级
    if (orderCount >= 30) {
      newLevel = '钻石';
    } else if (orderCount >= 10) {
      newLevel = '黄金';
    }
    
    console.log(`用户 ${tel} 订单数: ${orderCount}, 应该升级为: ${newLevel}`);
    
    // 更新用户会员等级
    const updateSql = `UPDATE users SET level = ? WHERE tel = ? AND level != ?`;
    db.query(updateSql, [newLevel, tel, newLevel], (updateErr, updateResult) => {
      if (updateErr) {
        console.error("更新会员等级失败:", updateErr);
        return;
      }
      
      if (updateResult.affectedRows > 0) {
        console.log(`用户 ${tel} 的会员等级已更新为 ${newLevel}`);
      }
    });
  });
}

// 待出餐订单查询 - 小程序端使用
router.get('/getChucan', (req, res) => {
  const { tel } = req.query;
  if (!tel) return res.status(400).json({ code: 400, msg: '缺少电话号码参数' });

  // 添加明确的排序，确保最新订单显示在前面
  db.query(`SELECT * FROM dingdan WHERE tel = ? AND is_chucan=0 ORDER BY dingdan_id DESC`, [tel], (err, data) => {
    if (err) {
      console.error("查询待出餐订单失败:", err);
      return res.status(500).json({ code: 500, msg: '查询失败' });
    }
    res.json({ list: data, code: 200, msg: "查询成功" });
  });
});

// 待确认订单查询 - 小程序端使用
router.get('/getQueren', (req, res) => {
  const { tel } = req.query;
  if (!tel) return res.status(400).json({ code: 400, msg: '缺少电话号码参数' });

  // 添加明确的排序，确保最新订单显示在前面
  db.query(`SELECT * FROM dingdan WHERE tel = ? AND is_queren=0 AND is_chucan=1 ORDER BY dingdan_id DESC`, [tel], (err, data) => {
    if (err) {
      console.error("查询待确认订单失败:", err);
      return res.status(500).json({ code: 500, msg: '查询失败' });
    }
    res.json({ list: data, code: 200, msg: "查询成功" });
  });
});

// 可评价订单查询 - 小程序端使用
router.get('/getPingjia', (req, res) => {
  const { tel } = req.query;
  if (!tel) return res.status(400).json({ code: 400, msg: '缺少电话号码参数' });

  // 添加明确的排序，确保最新订单显示在前面
  db.query(`SELECT * FROM dingdan WHERE tel = ? AND is_queren=1 ORDER BY dingdan_id DESC`, [tel], (err, data) => {
    if (err) {
      console.error("查询可评价订单失败:", err);
      return res.status(500).json({ code: 500, msg: '查询失败' });
    }
    res.json({ list: data, code: 200, msg: "查询成功" });
  });
});

module.exports = router;