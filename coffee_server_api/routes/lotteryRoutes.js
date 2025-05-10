const express = require('express');
const router = express.Router();
const db = require("../util/dbconfig");
// 抽奖
router.get('/luck', (req, res) => {
    console.log(req.query);
    let sql = `INSERT INTO luck(tel,msg,shijian,num) VALUES(?,?,?,?)`
    db.query(sql, [req.query.tel, req.query.msg, req.query.shijian, req.query.num], function (err, data) {
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
  
  // 获取个人抽奖 
  router.get('/getMyLuck', (req, res) => {
    let sql1 = `select * from luck where tel = '${req.query.tel}'`
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
  
  // 优惠券使用之后 删除优惠券
  router.get('/delLuck', (req, res) => {
    let sql = `delete from luck where luck_id = ${req.query.luck_id}`;
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
  module.exports = router;