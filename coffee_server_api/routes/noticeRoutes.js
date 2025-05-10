const express = require('express');
const router = express.Router();
const db = require("../util/dbconfig");
// 获取公告
router.get('/getGonggao', (req, res) => {
  let sql1 = `select * from gonggao`
  db.query(sql1, function (err, data) {
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

// 修改公告
router.get('/updateGonggao', (req, res) => {
  var sql = `update gonggao set msg='${req.query.msg}' where msg_id='1'`;
  console.log(req);
  db.query(sql, function (err, data) {
    if (err) {
      console.log(err, "v")
      res.send("修改失败 " + err);
    } else {
      // res.redirect("/users");
      console.log(data, "a")
      res.send({
        msg: "修改成功",
        code: 200

      });
    }
  })
})
module.exports = router;
