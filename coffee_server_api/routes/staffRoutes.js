// 员工管理api
const express = require('express');
const router = express.Router();
const db = require("../util/dbconfig");
const jwt = require('jsonwebtoken'); // 导入jsonwebtoken
const crypto = require('crypto'); // ✅ 引入模块

// JWT密钥，实际生产环境中应该放在环境变量中
const JWT_SECRET = 'coffee_shop_secret_key';

/**
 * 生成规律结构的员工ID
 * 格式: 年份(2位) + 门店id(2位) + 序号(2位) = 固定6位数
 * 例如: 250101 表示2025年01号门店第01号员工
 */
router.get('/generateStaffId', (req, res) => {
  try {
    const { store_id } = req.query;
    
    // 参数验证
    if (!store_id) {
      return res.status(400).json({ 
        code: 400, 
        msg: "缺少门店ID参数", 
        data: null 
      });
    }
    
    // 获取当前年份后两位
    const year = new Date().getFullYear().toString().slice(2);
    
    // 为该门店查找当前最大序列号
    const sequenceQuery = `
      SELECT MAX(staff_id) as max_id
      FROM staff
      WHERE staff_id LIKE ?
    `;
    
    // 构建前缀模式: 年份 + 门店代码
    const storeIdPadded = String(store_id).padStart(2, '0');
    const prefix = `${year}${storeIdPadded}`;
    const pattern = `${prefix}%`;
    
    db.query(sequenceQuery, [pattern], (err, result) => {
      if (err) {
        console.error('生成员工ID失败:', err);
        return res.status(500).json({
          code: 500,
          msg: "服务器内部错误",
          data: null
        });
      }
      
      let nextSequence = 1;
      
      if (result[0].max_id) {
        // 从现有ID中提取序列号部分
        const currentId = result[0].max_id.toString();
        if (currentId.length >= 6) {
          const currentSequence = parseInt(currentId.slice(-2));
          nextSequence = currentSequence + 1;
          // 确保序列号不超过99
          if (nextSequence > 99) {
            nextSequence = 99;
          }
        }
      }
      
      // 生成新的员工ID
      const sequencePadded = String(nextSequence).padStart(2, '0');
      const newStaffId = `${prefix}${sequencePadded}`;
      
      res.json({
        code: 200,
        msg: "员工ID生成成功",
        data: {
          staff_id: parseInt(newStaffId),
          store_id: parseInt(store_id),
          year: `20${year}`,
          sequence: nextSequence,
          pattern: `年份(${year}) + 门店(${storeIdPadded}) + 序号(${sequencePadded})`,
          idInfo: {
            year: year,
            storeCode: storeIdPadded,
            sequence: sequencePadded
          }
        }
      });
    });
  } catch (error) {
    console.error('生成员工ID失败:', error);
    res.status(500).json({
      code: 500,
      msg: "服务器内部错误",
      data: null
    });
  }
});

// 辅助函数: 生成员工ID
async function generateStaffId(storeId) {
  return new Promise((resolve, reject) => {
    const year = new Date().getFullYear().toString().slice(2);
    const storeIdPadded = String(storeId).padStart(2, '0');
    const prefix = `${year}${storeIdPadded}`;
    const pattern = `${prefix}%`;
    
    // 查询最大ID
    const sequenceQuery = `
      SELECT MAX(staff_id) as max_id
      FROM staff
      WHERE staff_id LIKE ?
    `;
    
    db.query(sequenceQuery, [pattern], (err, result) => {
      if (err) return reject(err);
      
      let nextSequence = 1;
      
      if (result[0].max_id) {
        // 从现有ID中提取序列号部分
        const currentId = result[0].max_id.toString();
        if (currentId.length >= 6) {
          const currentSequence = parseInt(currentId.slice(-2));
          nextSequence = currentSequence + 1;
          // 确保序列号不超过99
          if (nextSequence > 99) {
            nextSequence = 99;
          }
        }
      }
      
      // 生成新的员工ID
      const sequencePadded = String(nextSequence).padStart(2, '0');
      const newStaffId = `${prefix}${sequencePadded}`;
      
      resolve({
        code: 200,
        data: {
          staff_id: parseInt(newStaffId),
          store_id: parseInt(storeId),
          year: `20${year}`,
          sequence: nextSequence,
          pattern: `年份(${year}) + 门店(${storeIdPadded}) + 序号(${sequencePadded})`,
          idInfo: {
            year: year,
            storeCode: storeIdPadded,
            sequence: sequencePadded
          }
        }
      });
    });
  });
}

// 解析员工ID
router.get('/parseStaffId', (req, res) => {
  try {
    const { staff_id } = req.query;
    
    if (!staff_id) {
      return res.status(400).json({ 
        code: 400, 
        msg: "缺少员工ID参数" 
      });
    }
    
    const staffIdStr = staff_id.toString();
    // 确保ID长度正确
    if (staffIdStr.length < 6) {
      return res.status(400).json({
        code: 400,
        msg: "员工ID格式不正确"
      });
    }
    
    // 解析ID结构
    const year = staffIdStr.slice(0, 2);
    const storeCode = staffIdStr.slice(2, 4);
    const sequence = staffIdStr.slice(4, 6);
    
    res.json({
      code: 200,
      msg: "解析成功",
      data: {
        staff_id: parseInt(staffIdStr),
        store_id: parseInt(storeCode),
        year: `20${year}`,
        sequence: parseInt(sequence),
        pattern: `年份(${year}) + 门店(${storeCode}) + 序号(${sequence})`,
        idInfo: {
          year,
          storeCode,
          sequence
        }
      }
    });
  } catch (error) {
    console.error('解析员工ID失败:', error);
    res.status(500).json({
      code: 500,
      msg: "服务器内部错误"
    });
  }
});
/**
 * 根据角色获取角色代码
 * @param {string} role - 角色类型
 * @returns {string} - 角色代码
 */
function getRoleCode(role) {
  switch(role.toLowerCase()) {
    case 'admin':
      return '0';
    case 'manager':
      return '1';
    case 'staff':
    default:
      return '2';
  }
}

// 获取员工角色权限
router.get('/getRolePermissions', (req, res) => {
  const staffId = req.query.staffId;
  
  const sql = `
    SELECT s.staff_id, s.name, s.role, s.store_id, st.store_name
    FROM staff s
    LEFT JOIN stores st ON s.store_id = st.store_id
    WHERE s.staff_id = ?
  `;

  db.query(sql, [staffId], (err, results) => {
    if (err) {
      console.error('获取员工角色失败:', err);
      return res.status(500).json({
        code: 500,
        msg: "服务器内部错误",
        data: null
      });
    }
    
    if (results.length === 0) {
      return res.status(404).json({
        code: 404,
        msg: "未找到员工信息",
        data: null
      });
    }
    
    const staffInfo = results[0];
    let permissions = [];
    
    // 根据角色分配权限
    switch(staffInfo.role) {
      case 'admin':
        permissions = [
          'users', 'goods', 'list', 'stores', 'staff', 
          'fenlei', 'order', 'pinglun', 'gonggao'
        ];
        break;
      case 'manager':
        permissions = [
          'users', 'goods', 'list', 'staff',
          'fenlei', 'order', 'pinglun'
        ];
        break;
      case 'staff':
        permissions = [
          'users', 'goods', 'list', 'order', 'pinglun'
        ];
        break;
    }
    
    res.json({
      code: 200,
      msg: "success",
      data: {
        ...staffInfo,
        permissions
      }
    });
  });
});
// Function to generate MD5 hash
function getMd5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}
// 员工登录接口
router.post('/webLogin', (req, res) => {
  const { staffId, password } = req.body;
  
  if (!staffId || !password) {
    return res.status(400).json({
      code: 400,
      msg: "员工号和密码不能为空",
      data: null
    });
  }

  // 查询员工信息，包括门店信息
  const sql = `
    SELECT s.staff_id, s.name, s.password, s.phone, s.role, s.store_id, s.status,
           st.store_name
    FROM staff s
    LEFT JOIN stores st ON s.store_id = st.store_id
    WHERE s.staff_id = ?
  `;

  db.query(sql, [staffId], (err, results) => {
    if (err) {
      console.error('员工登录查询失败:', err);
      return res.status(500).json({
        code: 500,
        msg: "服务器内部错误",
        data: null
      });
    }
    
    // 如果没找到员工
    if (results.length === 0) {
      return res.status(404).json({
        code: 404,
        msg: "员工号不存在",
        data: null
      });
    }
    
    const staff = results[0];
    
    // 检查员工是否离职
    if (staff.status === '离职') {
      return res.status(403).json({
        code: 403,
        msg: "该员工已离职，无法登录系统",
        data: null
      });
    }
    
     // Check password - handle both plain text and MD5 hash
     const inputMd5 = getMd5(password);
     const isPasswordValid = 
       staff.password === password || // Plain text match
       staff.password === inputMd5;   // MD5 hash match
     
     if (!isPasswordValid) {
       return res.status(401).json({ code: 401, msg: '密码错误' });
     }

    // 生成JWT令牌
    const token = jwt.sign(
      {
        staffId: staff.staff_id,
        role: staff.role,
        storeId: staff.store_id
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 返回成功信息
    res.json({
      code: 200,
      msg: "登录成功",
      data: {
        staffId: staff.staff_id,
        name: staff.name,
        phone: staff.phone,
        role: staff.role,
        storeId: staff.store_id,
        storeName: staff.store_name,
        token: token
      }
    });
  });
});
// 获取所有员工
router.get('/getStaff', (req, res) => {
    const sql = `SELECT * FROM staff`;
    db.query(sql, (err, results) => {
      if (err) return res.send({ code: 500, msg: "查询失败", error: err });
      res.send({ code: 200, msg: "成功", list: results });
    });
  });
  
  // 搜索员工
  router.get('/searchStaff', (req, res) => {
    const keyword = req.query.keyword || '';
    const sql = `SELECT * FROM staff WHERE name LIKE ? OR phone LIKE ?`;
    const searchTerm = `%${keyword}%`;
    db.query(sql, [searchTerm, searchTerm], (err, results) => {
      if (err) return res.send({ code: 500, msg: "搜索失败", error: err });
      res.send({ code: 200, msg: "成功", list: results });
    });
  });
  
  // 添加员工 - 更新版本：非管理员只能添加自己门店的员工
router.get('/addStaff', async (req, res) => {
  try {
    const { name, phone, role, store_id, gender, password = '123456' } = req.query;
    
    // 提取当前请求用户信息
    const token = req.headers.authorization?.split(' ')[1];
    let requestUserRole = 'staff';
    let requestUserStoreId = null;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        requestUserRole = decoded.role;
        requestUserStoreId = decoded.storeId;
      } catch (e) {
        console.error('Token verification failed:', e);
      }
    }
    
    // 参数验证
    if (!name || !phone || !role || !gender) {
      return res.send({ code: 400, msg: "缺少必填字段" });
    }
    
    // 确定门店ID - 非管理员只能添加自己门店的员工
    let finalStoreId;
    if (requestUserRole === 'admin') {
      // 管理员可以选择门店
      if (!store_id) {
        return res.send({ code: 400, msg: "管理员添加员工需要指定门店ID" });
      }
      finalStoreId = store_id;
    } else {
      // 非管理员只能添加自己门店的员工
      if (!requestUserStoreId) {
        return res.send({ code: 403, msg: "没有权限添加其他门店的员工" });
      }
      finalStoreId = requestUserStoreId;
    }
    
    // 确保非管理员无法添加admin角色的员工
    let finalRole = role;
    if (requestUserRole !== 'admin' && role === 'admin') {
      finalRole = 'staff'; // 降级为普通员工
    }
    
    // 生成员工ID
    const staffIdResponse = await generateStaffId(finalStoreId, finalRole);
    
    if (!staffIdResponse || !staffIdResponse.data || !staffIdResponse.data.staff_id) {
      return res.send({ code: 500, msg: "生成员工ID失败" });
    }
    
    const staffId = staffIdResponse.data.staff_id;
    
    const sql = `INSERT INTO staff SET ?`;
    const staffData = {
      staff_id: staffId,
      name,
      phone,
      role: finalRole,
      store_id: finalStoreId,
      gender,
      password: getMd5(password), // MD5加密
      created_at: new Date(),
      status: '在职'
    };
  
    db.query(sql, staffData, (err, result) => {
      if (err) return res.send({ code: 500, msg: "添加失败", error: err });
      res.send({ 
        code: 200, 
        msg: "添加成功",
        data: {
          staff_id: staffId,
          name,
          role: finalRole,
          store_id: finalStoreId,
          idInfo: staffIdResponse.data.idInfo
        }
      });
    });
  } catch (error) {
    console.error('添加员工失败:', error);
    res.send({ code: 500, msg: "添加失败", error: error.message });
  }
});
  
  // 更新员工
  router.get('/updateStaff', (req, res) => {
    const { staff_id, name, phone, role, store_id, status, gender, password } = req.query;
    if (!staff_id) return res.send({ code: 400, msg: "缺少员工ID" });
  
    const updateFields = {
      name,
      phone,
      role,
      store_id,
      status,
      gender
    };
  
    if (password) {
      updateFields.password = getMd5(password);
    }
  
    const sql = `UPDATE staff SET ? WHERE staff_id = ?`;
    db.query(sql, [updateFields, staff_id], (err, result) => {
      if (err) return res.send({ code: 500, msg: "更新失败", error: err });
      if (result.affectedRows === 0) {
        return res.send({ code: 404, msg: "员工不存在" });
      }
      res.send({ code: 200, msg: "更新成功" });
    });
  });
  
  // 删除员工
  router.get('/deleteStaff', (req, res) => {
    const { staff_id } = req.query;
    if (!staff_id) return res.send({ code: 400, msg: "缺少员工ID" });
  
    const sql = `DELETE FROM staff WHERE staff_id = ?`;
    db.query(sql, [staff_id], (err, result) => {
      if (err) return res.send({ code: 500, msg: "删除失败", error: err });
      if (result.affectedRows === 0) {
        return res.send({ code: 404, msg: "员工不存在" });
      }
      res.send({ code: 200, msg: "删除成功" });
    });
  });

// 解析员工ID
router.get('/parseStaffId', (req, res) => {
  try {
    const { staff_id } = req.query;
    
    if (!staff_id) {
      return res.status(400).json({ 
        code: 400, 
        msg: "缺少员工ID参数" 
      });
    }
    
    const staffIdStr = staff_id.toString();
    // 确保ID长度正确
    if (staffIdStr.length < 9) {
      return res.status(400).json({
        code: 400,
        msg: "员工ID格式不正确"
      });
    }
    
    // 解析ID结构
    const storeCode = staffIdStr.slice(0, 2);
    const roleCode = staffIdStr.slice(2, 3);
    const year = staffIdStr.slice(3, 5);
    const sequence = staffIdStr.slice(5);
    
    // 角色名称映射
    const roleMap = {
      '0': 'admin',
      '1': 'manager',
      '2': 'staff'
    };
    
    res.json({
      code: 200,
      msg: "解析成功",
      data: {
        staff_id: parseInt(staffIdStr),
        store_id: parseInt(storeCode),
        role: roleMap[roleCode] || 'staff',
        year: `20${year}`,
        sequence: parseInt(sequence),
        pattern: `店铺(${storeCode}) + 角色(${roleCode}) + 年份(${year}) + 序号(${sequence})`,
        idInfo: {
          storeCode,
          roleCode,
          year,
          sequence
        }
      }
    });
  } catch (error) {
    console.error('解析员工ID失败:', error);
    res.status(500).json({
      code: 500,
      msg: "服务器内部错误"
    });
  }
});

// 辅助函数: 生成员工ID
async function generateStaffId(storeId, role) {
  return new Promise((resolve, reject) => {
    const roleCode = getRoleCode(role);
    const year = new Date().getFullYear().toString().slice(2);
    const storeIdPadded = String(storeId).padStart(2, '0');
    const prefix = `${storeIdPadded}${roleCode}${year}`;
    const pattern = `${prefix}%`;
    
    // 查询最大ID
    const sequenceQuery = `
      SELECT MAX(staff_id) as max_id
      FROM staff
      WHERE staff_id LIKE ?
    `;
    
    db.query(sequenceQuery, [pattern], (err, result) => {
      if (err) return reject(err);
      
      let nextSequence = 1;
      
      if (result[0].max_id) {
        // 从现有ID中提取序列号部分
        const currentId = result[0].max_id.toString();
        if (currentId.length >= 9) {
          const currentSequence = parseInt(currentId.slice(-4));
          nextSequence = currentSequence + 1;
        }
      }
      
      // 生成新的员工ID
      const sequencePadded = String(nextSequence).padStart(4, '0');
      const newStaffId = `${prefix}${sequencePadded}`;
      
      resolve({
        code: 200,
        data: {
          staff_id: parseInt(newStaffId),
          store_id: parseInt(storeId),
          role: role,
          year: `20${year}`,
          sequence: nextSequence,
          pattern: `店铺(${storeIdPadded}) + 角色(${roleCode}) + 年份(${year}) + 序号(${sequencePadded})`,
          idInfo: {
            storeCode: storeIdPadded,
            roleCode: roleCode,
            year: year,
            sequence: sequencePadded
          }
        }
      });
    });
  });
}

module.exports = router;