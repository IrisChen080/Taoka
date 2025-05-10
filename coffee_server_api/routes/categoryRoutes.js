const express = require('express');
const router = express.Router();
const db = require("../util/dbconfig");
/**
 * 获取全部分类数据
 */
router.get('/getClassTabs', (req, res) => {
  const sql = `SELECT * FROM fenlei`;
  db.query(sql, (err, data) => {
    if (err) return res.status(500).json({ code: 500, msg: '查询失败' });
    res.json({ list: data, code: 200, msg: "查询成功" });
  });
});

/**
 * 修改分类名称
 * @param {number} fenlei_id - 必需，分类ID
 * @param {string} text - 必需，新的分类名称
 */
router.get('/updateClassTabs', (req, res) => {
  const { fenlei_id, text } = req.query;
  if (!fenlei_id || !text) return res.status(400).json({ code: 400, msg: '参数不完整' });

  const sql = `UPDATE fenlei SET text = ? WHERE fenlei_id = ?`;
  db.query(sql, [text, fenlei_id], (err) => {
    if (err) return res.status(500).json({ code: 500, msg: '修改失败' });
    res.json({ code: 200, msg: "修改成功" });
  });
});

/**
 * 新增商品分类
 * @param {string} text - 必需，分类名称
 */
router.get('/addClassTabs', (req, res) => {
  const { text } = req.query;
  if (!text) return res.status(400).json({ code: 400, msg: '分类名称不能为空' });

  const sql = `INSERT INTO fenlei (text) VALUES (?)`;
  db.query(sql, [text], (err) => {
    if (err) return res.status(500).json({ code: 500, msg: '添加失败' });
    res.json({ code: 200, msg: "添加成功" });
  });
});

/**
 * 删除指定分类
 * @param {number} fenlei_id - 必需，分类ID
 */
router.get('/delClassTabs', (req, res) => {
  const { fenlei_id } = req.query;
  if (!fenlei_id) return res.status(400).json({ code: 400, msg: '缺少分类ID' });

  const sql = `DELETE FROM fenlei WHERE fenlei_id = ?`;
  db.query(sql, [fenlei_id], (err) => {
    if (err) return res.status(500).json({ code: 500, msg: '删除失败' });
    res.json({ code: 200, msg: "删除成功" });
  });
});

/**
 * 获取指定分类和门店的上架商品列表
 * @param {number} fenlei_id - 必需，商品分类ID
 * @param {number} [store_id=1] - 可选，门店ID（默认1）
 */
router.get('/getByCategory', (req, res) => {
  const { fenlei_id, store_id = 1 } = req.query;

  if (!fenlei_id) return res.status(400).json({ code: 400, msg: '缺少分类ID' });

  const sql = `
    SELECT g.* 
    FROM goods g
    JOIN store_inventory si ON g.goods_id = si.goods_id
    WHERE g.fenlei_id = ? 
      AND si.status = '上架'
      AND si.store_id = ?`;

  db.query(sql, [fenlei_id, store_id], (err, data) => {
    if (err) return res.status(500).json({ code: 500, msg: "查询失败" });
    res.json({ list: data, code: 200, msg: "查询成功" });
  });
});
module.exports = router;