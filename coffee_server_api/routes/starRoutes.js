const express = require('express');
const router = express.Router();
const db = require("../util/dbconfig");

/// 获取用户收藏
router.get('/getStar', (req, res) => {
  let sql1 = `select * from star`
  db.query(sql1, function (err, data) {
    if (err) {
      res.send({
        msg: "获取失败",
        code: 500
      });
    } else {
      res.send({
        list: data,
        msg: "获取成功！",
        code: "200"
      });
    }
  });
});

//  删除收藏
router.get('/delUserStar', (req, res) => {
  let sql = `delete from star where star_id = ${req.query.star_id}`;
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

// 检查是否已收藏
router.get('/isStar', (req, res) => {
  const sql = `SELECT * FROM star WHERE tel = ? AND goods_id = ?`;
  db.query(sql, [req.query.tel, req.query.goods_id], (err, data) => {
    if (err) {
      res.status(500).send({ code: 500, msg: "查询失败" });
    } else {
      res.send({ list: data, code: 200, msg: "查询成功" });
    }
  });
});
// 查看咖啡是否已经收藏    
router.get('/isStar', (req, res) => {
  let sql = `select * from star where tel = '${req.query.tel}' && goods_id = '${req.query.goods_id}'`  // 查找数据表中是否存在
  db.query(sql, (err, data) => {
    if (err) {
      res.send({
        code: 500,
        msg: "获取失败"
      })
    } else {
      res.send({
        list: data,
        code: 200,
        msg: "获取数据成功"
      })
    }
  });
});

//取消收藏
router.get('/delStar', (req, res) => {
  let sql = `delete from star where goods_id = ${req.query.goods_id} AND tel = ${req.query.tel}`;
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

// 我的收藏
router.get('/getMyStar', (req, res) => {
  console.log(req.query);
  let sql1 = `select * from star where tel = '${req.query.tel}'`
  db.query(sql1, function (err, data) {
    if (err) {
      res.send({
        msg: "获取失败",
        code: 500
      });
    } else {
      res.send({
        list: data,
        msg: "获取成功！",
        code: "200"
      });
    }
  });
});
// 添加到收藏
router.get('/addStar', (req, res) => {
  console.log(req.query);
  let sql2 = `INSERT INTO star(fenlei_id,goods_id,title,img,ingredients,money,tel) VALUES(?,?,?,?,?,?,?)`    // 插入语句，将前端传递过来的手机号和密码插入到数据库中
  // data 为查询出来的结果，如果查询的手机号不存在，将会返回一个空数据 所有此时 data[0]==undefined, 执行插入语句操作;
  db.query(sql2, [req.query.fenlei_id, req.query.goods_id, req.query.title, req.query.img, req.query.ingredients, req.query.money, req.query.tel], function (err, data) {
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