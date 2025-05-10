const express = require('express');
const router = express.Router();
const db = require("../util/dbconfig");


// 获取全站评论（包含商品名称，管理员专用）
router.get('/getComment', (req, res) => {
  const sql = `SELECT p.*, g.title AS goods_name 
              FROM pinglun p
              LEFT JOIN goods g ON p.goods_id = g.goods_id
              ORDER BY p.shijian DESC`;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('查询失败:', err);
      return res.status(500).json({ code: 500, msg: "服务器错误" });
    }
    res.json({ code: 200, data: results, msg: "查询成功" });
  });
});

// 获取咖啡评论
router.get('/getPinglun', (req, res) => {
  let sql1 = `select * from pinglun where goods_id = '${req.query.goods_id}'`
  db.query(sql1, function (err, data) {
    if (err) {
      res.send({
        msg: "查询失败",
        code: 500
      });
    } else {
      res.send({
        list: data,
        msg: "查询成功！",
        code: "200"
      });
    }
  });
});
// 根据用户手机号查询用户评论
router.get('/searchPinglun', (req, res) => {
  // 查询语句
  let sql = `select * from pinglun where tel REGEXP '${req.query.tel}'`
  db.query(sql, (err, data) => {
    if (err) {
      console.log(err);
      return res.json({
        code: 500,
        msg: '搜索失败'
      })
    } else {
      console.log(data)
      res.send({
        list: data,
        code: 200,
        msg: "搜索成功"
      });
    }
  })
});

// 获取用户所有评论
router.get('/getPinglunAll', (req, res) => {
  let sql = `select * from pinglun`
  db.query(sql, function (err, data) {
    if (err) {
      res.send({
        msg: "查询失败",
        code: 500
      });
    } else {
      console.log(data)
      res.send({
        list: data,
        msg: "查询成功！",
        code: "200"
      });
    }
  });
});

// 删除评论 
router.get('/delPinglun', (req, res) => {
  let sql = `delete from pinglun where pinglun_id = ${req.query.pinglun_id}`;
  db.query(sql, (err, data) => {
    if (err) {
      console.log(err)
      res.send({
        code: 500,
        msg: "删除失败"
      })
    } else {
      res.send({
        code: 200,
        msg: "删除成功"
      })
    }
  })
})

// 修改评论
router.get('/updatePinglun', (req, res) => {
  var sql = `update pinglun set msg='${req.query.msg}',star='${req.query.star}' where pinglun_id='${req.query.pinglun_id}'`;
  console.log(req.query);
  db.query(sql, function (err, data) {
    if (err) {
      console.log(err, "v")
      res.send("修改失败 " + err);
    } else {
      console.log(data, "a")
      res.send({
        msg: "修改成功",
        code: 200

      });
    }
  })
})
// 评论
router.get('/addComment', (req, res) => {
  console.log(req.query);
  let sql = `INSERT INTO pinglun(nickName,name_img,goods_id,msg,star,tel,shijian) VALUES(?,?,?,?,?,?,?)`    // 插入语句，将前端传递过来的手机号和密码插入到数据库中
  db.query(sql, [req.query.nickName, req.query.name_img, req.query.goods_id, req.query.msg, req.query.star, req.query.tel, req.query.shijian], function (err, data) {
    if (err) {
      res.send({
        code: 500,
        msg: "添加失败!",
      });
      console.log(err)
    } else {
      res.send({
        msg: "添加成功!",
        code: 200
      });
    }
  });
});

module.exports = router;