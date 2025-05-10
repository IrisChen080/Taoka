const express = require('express');
const router = express.Router();
const db = require("../util/dbconfig");
const cors = require('cors');

// 顾客注册
router.get('/register', (req, res) => {
  const { tel, nickname, paw } = req.query;
  if (!tel || !nickname || !paw) {
    return res.status(400).json({ code: 400, msg: '参数不完整' });
  }

  const telRegex = /^1[3-9]\d{9}$/;
  if (!telRegex.test(tel)) {
    return res.status(422).json({ code: 422, msg: '手机号格式错误' });
  }

  const checkSql = `SELECT * FROM users WHERE tel = ? OR nickname = ?`;
  db.query(checkSql, [tel, nickname], (err, results) => {
    if (err) return res.status(500).json({ code: 500, msg: '系统错误' });

    if (results.length > 0) {
      const errors = [];
      if (results.some(r => r.tel === tel)) errors.push('手机号');
      if (results.some(r => r.nickname === nickname)) errors.push('昵称');
      return res.status(409).json({ code: 409, msg: `${errors.join('和')}已存在` });
    }

    const insertSql = `INSERT INTO users (tel, nickname, paw) VALUES (?, ?, ?)`;
    db.query(insertSql, [tel, nickname, paw], (err, result) => {
      if (err) return res.status(500).json({ code: 500, msg: '注册失败' });
      res.json({
        code: 200,
        msg: '注册成功',
        data: { user_id: result.insertId }
      });
    });
  });
});

// 顾客登录
router.get('/signIn', (req, res) => {
  const { tel, paw } = req.query;
  const sql = `SELECT * FROM users WHERE tel = ?`;
  db.query(sql, [tel], (err, data) => {
    if (err) return res.status(500).json({ code: 500, msg: '系统错误' });

    if (data.length === 0) {
      return res.json({ code: 404, msg: "用户未注册" });
    }

    if (data[0].paw !== paw) {
      return res.json({ code: 401, msg: "密码错误" });
    }

    res.json({
      data: data[0],
      code: 200,
      msg: "登录成功"
    });
  });
});

// 获取所有用户信息
router.get('/getUser', (req, res) => {
  let sql = `SELECT * FROM users`;
  db.query(sql, function (err, data) {
    if (err) {
      res.send({
        msg: "查询失败",
        code: 500
      });
    } else {
      res.send({
        list: data,
        msg: "查询成功！",
        code: 200
      });
    }
  });
});

// 获取用户个人信息
router.get('/getUserInfo', (req, res) => {
  console.log("Received request with ID:", req.query.id); // 日志
  let sql = `SELECT * FROM users WHERE user_id = ?`;
  db.query(sql, [req.query.id], (err, data) => {
    if (err) {
      console.error("Database query error:", err); // 记录错误
      return res.status(500).send({ msg: '查询失败', code: 500, error: err });
    }
    console.log("Database query result:", data); // 记录查询结果
    res.send({
      userInfo: data.length ? data[0] : {},
      msg: '查询成功！',
      code: 200
    });
  });
});

// 搜索用户
router.get('/searchMember', (req, res) => {
  const { nickname, tel, level } = req.query;
  let conditions = [];
  let queryParams = [];

  // 动态构建查询条件
  if (nickname) {
    conditions.push("nickname REGEXP ?");
    queryParams.push(nickname);
  }
  if (tel) {
    conditions.push("tel REGEXP ?");
    queryParams.push(tel);
  }
  if (level) {
    conditions.push("level REGEXP ?");
    queryParams.push(level);
  }
  // 检查是否有搜索条件
  if (conditions.length === 0) {
    return res.status(400).json({
      code: 400,
      msg: '必须提供昵称,电话或会员等级作为搜索条件'
    });
  }

  // 构建SQL查询语句
  const sql = `SELECT * FROM users WHERE ${conditions.join(' OR ')}`;

  // 执行数据库查询
  db.query(sql, queryParams, (err, data) => {
    if (err) {
      console.error('搜索失败:', err);
      return res.status(500).json({
        code: 500,
        msg: '搜索失败'
      });
    }
    res.json({
      list: data,
      code: 200,
      msg: "搜索成功"
    });
  });
});

// 删除用户
router.get('/delUser', (req, res) => {
  let sql = `DELETE FROM users WHERE user_id = ?`;
  db.query(sql, [req.query.id], (err, data) => {
    if (err) {
      console.log(err);
      res.send({
        code: 500,
        msg: "删除失败"
      });
    } else {
      res.send({
        code: 200,
        msg: "删除成功"
      });
    }
  });
});

// 小程序端用户信息修改
router.put('/xgUser', (req, res) => {
  const { tel, nickname, xingbie, birthday } = req.body;
  
  // 参数验证
  if (!tel || !nickname) {
    return res.status(400).send({ code: 400, msg: "手机号和昵称不能为空" });
  }
  
  // 直接使用前端传递的birthday，确保格式为YYYY-MM-DD
  const sql = 'UPDATE users SET nickname = ?, xingbie = ?, birthday = ? WHERE tel = ?';
  db.query(sql, [nickname, xingbie, birthday, tel], (error, results) => {
    if (error) {
      console.error("Database Error:", error);
      return res.status(500).send({ code: 500, msg: "数据库错误", error });
    }
    
    if (results.affectedRows === 0) {
      return res.status(404).send({ code: 404, msg: "用户不存在或信息未变更" });
    }
    
    // 查询更新后的用户信息返回给客户端
    const querySql = 'SELECT * FROM users WHERE tel = ?';
    db.query(querySql, [tel], (queryErr, queryResults) => {
      if (queryErr) {
        return res.status(200).send({ code: 200, msg: "用户信息更新成功，但获取最新信息失败" });
      }
      
      res.status(200).send({ 
        code: 200, 
        msg: "用户信息更新成功", 
        data: queryResults.length > 0 ? queryResults[0] : null 
      });
    });
  });
});

// 更新用户会员等级
// 更新用户会员等级
router.put('/updateUserLevel', (req, res) => {
  // 支持通过user_id或tel更新
  const { user_id, tel, level } = req.body;
  
  if ((!user_id && !tel) || !level) {
    return res.status(400).send({ code: 400, msg: "用户ID或电话号码,以及会员等级不能为空" });
  }
  
  const validLevels = ['普通', '黄金', '钻石'];
  if (!validLevels.includes(level)) {
    return res.status(400).send({ code: 400, msg: "无效的会员等级" });
  }
  
  let sql, params;
  if (user_id) {
    sql = 'UPDATE users SET level = ? WHERE user_id = ?';
    params = [level, user_id];
  } else {
    sql = 'UPDATE users SET level = ? WHERE tel = ?';
    params = [level, tel];
  }
  
  db.query(sql, params, (error, results) => {
    if (error) {
      console.error("Database Error:", error);
      return res.status(500).send({ code: 500, msg: "数据库错误", error });
    }
    
    if (results.affectedRows === 0) {
      return res.status(404).send({ code: 404, msg: "用户不存在" });
    }
    
    // 查询更新后的用户信息
    const querySql = user_id ? 
      'SELECT * FROM users WHERE user_id = ?' : 
      'SELECT * FROM users WHERE tel = ?';
    const queryParam = user_id ? user_id : tel;
    
    db.query(querySql, [queryParam], (queryErr, userData) => {
      if (queryErr) {
        return res.status(200).send({ 
          code: 200, 
          msg: "会员等级更新成功，但获取最新信息失败" 
        });
      }
      
      res.status(200).send({ 
        code: 200, 
        msg: "会员等级更新成功", 
        data: userData.length > 0 ? userData[0] : null 
      });
    });
  });
});
// 获取用户订单统计信息
router.get('/getUserOrderStats', (req, res) => {
  const { tel } = req.query;
  if (!tel) {
    return res.status(400).json({ code: 400, msg: '缺少电话号码参数' });
  }

  // 获取用户订单数量
  const orderCountSql = `
    SELECT COUNT(DISTINCT bianhao) as orderCount 
    FROM dingdan 
    WHERE tel = ? AND is_queren = '1'
  `;
  
  // 获取用户消费总额
  const totalSpentSql = `
    SELECT SUM(money * shopNum) as totalSpent
    FROM dingdan
    WHERE tel = ? AND is_queren = '1'
  `;
  
  // 获取用户当前等级
  const userLevelSql = `
    SELECT level FROM users WHERE tel = ?
  `;
  
  db.query(orderCountSql, [tel], (countErr, countResult) => {
    if (countErr) {
      return res.status(500).json({ code: 500, msg: '查询订单数量失败' });
    }
    
    db.query(totalSpentSql, [tel], (spentErr, spentResult) => {
      if (spentErr) {
        return res.status(500).json({ code: 500, msg: '查询消费金额失败' });
      }
      
      db.query(userLevelSql, [tel], (levelErr, levelResult) => {
        if (levelErr) {
          return res.status(500).json({ code: 500, msg: '查询会员等级失败' });
        }
        
        const orderCount = countResult[0]?.orderCount || 0;
        const totalSpent = spentResult[0]?.totalSpent || 0;
        const currentLevel = levelResult[0]?.level || '普通';
        
        // 计算升级进度
        let nextLevel = '钻石';
        let progress = 100;
        let ordersNeeded = 0;
        
        if (currentLevel === '普通') {
          nextLevel = '黄金';
          progress = Math.min(100, Math.floor((orderCount / 10) * 100));
          ordersNeeded = Math.max(0, 10 - orderCount);
        } else if (currentLevel === '黄金') {
          nextLevel = '钻石';
          progress = Math.min(100, Math.floor(((orderCount - 10) / 20) * 100));
          ordersNeeded = Math.max(0, 30 - orderCount);
        }
        
        // 会员特权信息
        const memberPrivileges = {
          '普通': ['正常价格'],
          '黄金': ['会员价格', '9折优惠', '优先出餐'],
          '钻石': ['会员价格', '8折优惠', '优先出餐', '每月免费咖啡一杯']
        };
        
        res.json({
          code: 200,
          msg: '获取成功',
          data: {
            orderCount,
            totalSpent: parseFloat(totalSpent).toFixed(2),
            currentLevel,
            nextLevel,
            progress,
            ordersNeeded,
            privileges: memberPrivileges[currentLevel] || []
          }
        });
      });
    });
  });
});
module.exports = router;