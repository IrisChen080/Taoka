// pages/detail/detail.js
Page({
  data: {
    obj: {},
    itemArr: [],
    is_active: '', // 收藏状态
    pinglunNum: "",
    store_id: 1, // 添加默认门店ID
    rating: 5 // 默认评分 5 分
  },

  onLoad: function (options) {
    const store_id = parseInt(options.store_id) || 1;
    this.setData({
      obj: JSON.parse(options.data),
      store_id: store_id
    });

    this.getData();
  },

  onShow: function () {
    this.isStar();
    this.getPinglun();
  },

  // 获取有库存商品（修正API端点和数据处理）
  getData() {
    wx.showLoading({
      title: '加载中...'
    });
    wx.request({
      // 更改为正确的API端点
      url: 'http://127.0.0.1:5000/product/withStock',
      data: {
        store_id: this.data.store_id // 添加门店参数
      },
      success: res => {
        console.log('推荐商品数据:', res.data);
        if (res.data.code === 200 && res.data.data) {
          // 修正数据访问方式，使用data而不是list
          const productList = res.data.data || [];

          // 转换数据格式以匹配前端需要的字段
          const formattedProducts = productList.map(item => ({
            goods_id: item.id,
            title: item.name,
            money: item.price,
            img: item.image,
            ingredients: item.description,
            stock: item.stock,
            status: item.status,
            store_id: this.data.store_id
          }));

          // 限制显示数量，避免过多
          const limitedProducts = formattedProducts.length > 10 ?
            formattedProducts.slice(0, 10) :
            formattedProducts;

          this.setData({
            dataList: limitedProducts
          });
        } else {
          // 处理没有数据的情况
          this.setData({
            dataList: []
          });
          console.log('没有获取到推荐商品数据');
        }
        wx.hideLoading();
      },
      fail: err => {
        console.error('获取推荐商品失败:', err);
        this.setData({
          dataList: []
        });
        wx.hideLoading();
      }
    });
  },

  // 修改后的添加收藏方法
  addStar() {
    const {
      obj
    } = this.data
    const requiredParams = [
      'title', 'ingredients', 'money', 'img',
      'goods_id', 'fenlei_id'
    ]

    // 参数完整性校验
    if (!requiredParams.every(key => Object.keys(obj).includes(key))) {
      wx.showToast({
        title: '商品数据不完整',
        icon: 'none'
      })
      return
    }

    wx.request({
      url: 'http://127.0.0.1:5000/star/addStar',
      data: {
        title: obj.title,
        tel: wx.getStorageSync("tel"),
        ingredients: obj.ingredients,
        money: obj.money,
        img: obj.img,
        goods_id: obj.goods_id,
        fenlei_id: obj.fenlei_id
      },
      success: (res) => {
        if (res.data.code === 200) {
          wx.showToast({
            title: '收藏成功'
          })
          this.isStar()
        } else {
          wx.showToast({
            title: res.data.msg || '收藏失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error('收藏请求失败:', err)
        wx.showToast({
          title: '网络异常，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 强化取消收藏方法
  delStar() {
    wx.showModal({
      title: '提示',
      content: '确定要取消收藏吗？',
      success: (res) => {
        if (res.confirm) {
          wx.request({
            url: 'http://127.0.0.1:5000/star/delStar',
            method: 'GET', // 修改为 GET 方法
            data: {
              tel: wx.getStorageSync("tel"),
              goods_id: this.data.obj.goods_id
            },
            success: (res) => {
              if (res.data.code === 200) {
                this.isStar()
                wx.showToast({
                  title: '已取消收藏'
                })
              }
            },
            fail: (err) => {
              console.error('取消收藏失败:', err);
              wx.showToast({
                title: '取消失败',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  },
  // 获取评论方法
  getPinglun() {
    wx.showLoading({
      title: '加载中...'
    })
    wx.request({
      url: 'http://127.0.0.1:5000/comment/getPinglun',
      data: {
        goods_id: this.data.obj.goods_id
      },
      header: {
        'content-type': 'application/json'
      },
      success: res => {
        wx.hideLoading()

        // 评论列表
        const list = res.data.list || [];
        // 评论条数
        const pinglunNum = list.length;

        // 默认评分 5
        let rating = 5;

        // 如果有评论，就计算平均值
        if (pinglunNum > 0) {
          const totalStars = list.reduce((sum, item) => {
            // 确保 star 字段存在且为数字
            return sum + (Number(item.star) || 0);
          }, 0);
          rating = (totalStars / pinglunNum).toFixed(1);
        }

        // 更新到 data
        this.setData({
          pinglunNum,
          rating
        });
        console.log(rating);
      },
      fail: err => {
        wx.hideLoading()
        console.error('获取评论失败:', err);
      }
    })
  },

  // 修改后的收藏状态检查
  isStar() {
    wx.request({
      url: 'http://127.0.0.1:5000/star/isStar',
      data: {
        tel: wx.getStorageSync("tel"),
        goods_id: this.data.obj.goods_id
      },
      success: res => {
        // 添加空值保护
        this.setData({
          is_active: res.data?.list?.length > 0 || false
        });
      },
      fail: () => {
        this.setData({
          is_active: false
        })
      }
    });
  },

  // 检查购物车中的商品是否都来自同一门店
  validateCartStore(storeId) {
    // 获取购物车
    const cartArr = wx.getStorageSync('cartArr') || [];

    // 如果购物车为空，可以添加任何门店的商品
    if (cartArr.length === 0) {
      return true;
    }

    // 找出购物车中的门店ID (假设所有商品都应该是同一门店)
    const existingStoreIds = cartArr.map(item => item.store_id);
    const uniqueStoreIds = [...new Set(existingStoreIds)];

    // 如果已经有多个门店的商品，或者尝试添加的商品与现有商品来自不同门店
    if (uniqueStoreIds.length > 1 || !uniqueStoreIds.includes(storeId)) {
      return false;
    }

    return true;
  },

  // 清空购物车并添加新商品
  resetCartAndAddProduct(newItem, isCheckout = false) {
    // 创建新的购物车数组，只包含当前要添加的商品
    const newCart = [newItem];

    // 保存到本地存储
    wx.setStorageSync('cartArr', newCart);

    // 提示用户
    wx.showToast({
      title: '已更新购物车',
      icon: 'success'
    });

    // 如果是立即购买，跳转到购物车页面
    if (isCheckout) {
      setTimeout(() => {
        wx.switchTab({
          url: '../cart/cart',
          success: () => {
            const page = getCurrentPages().pop();
            if (page) page.onLoad();
          }
        });
      }, 200);
    }
  },

  // 添加到购物车（添加store_id和门店验证）
  addCart() {
    const storeId = this.data.store_id;

    // 验证购物车门店一致性
    if (!this.validateCartStore(storeId)) {
      // 如果购物车中已有其他门店商品，提示用户
      wx.showModal({
        title: '购物车已有其他门店商品',
        content: '不能同时购买不同门店的商品。是否清空购物车并添加此商品？',
        success: (res) => {
          if (res.confirm) {
            // 用户确认清空购物车
            const newItem = {
              ...this.data.obj,
              shopNum: 1,
              check: false,
              store_id: storeId
            };
            this.resetCartAndAddProduct(newItem);
          }
        }
      });
      return;
    }

    const cartArr = wx.getStorageSync('cartArr') || [];
    const newItem = {
      ...this.data.obj,
      shopNum: 1,
      check: false,
      store_id: storeId // 添加门店信息
    };

    const index = cartArr.findIndex(item =>
      item.goods_id === newItem.goods_id && item.store_id === newItem.store_id
    );

    if (index === -1) {
      cartArr.push(newItem);
    } else {
      cartArr[index].shopNum++;
    }

    wx.setStorageSync('cartArr', cartArr);
    wx.showToast({
      title: '添加成功',
      icon: 'success'
    });
  },

  // 详情
  goDetail(e) {
    console.log(e.currentTarget.dataset.obj);
    const product = e.currentTarget.dataset.obj;
    wx.navigateTo({
      url: `../detail/detail?data=${JSON.stringify(product)}&store_id=${this.data.store_id}`
    });
  },

  // 立即购买(添加门店验证)
  gmCart() {
    const {
      obj,
      store_id
    } = this.data;

    // 验证购物车门店一致性
    if (!this.validateCartStore(store_id)) {
      // 如果购物车中已有其他门店商品，提示用户
      wx.showModal({
        title: '购物车已有其他门店商品',
        content: '不能同时购买不同门店的商品。是否清空购物车并购买此商品？',
        success: (res) => {
          if (res.confirm) {
            // 用户确认清空购物车并进行购买
            const newItem = {
              ...obj,
              shopNum: 1,
              check: true,
              store_id
            };
            this.resetCartAndAddProduct(newItem, true);
          }
        }
      });
      return;
    }

    const cartArr = wx.getStorageSync('cartArr') || [];

    // 创建包含门店信息的商品对象
    const newItem = {
      ...obj,
      shopNum: 1,
      check: true, // 设为选中状态，这样购物车页面会自动选择此商品
      store_id // 添加门店ID
    };

    // 增加门店校验（同一商品不同门店视为不同商品）
    const index = cartArr.findIndex(item =>
      item.goods_id === newItem.goods_id &&
      item.store_id === newItem.store_id
    );

    if (index === -1) {
      cartArr.push(newItem);
    } else {
      cartArr[index].shopNum++;
      cartArr[index].check = true;
    }

    // 将其他商品设为未选中
    cartArr.forEach(item => {
      if (item.goods_id !== obj.goods_id || item.store_id !== store_id) {
        item.check = false;
      }
    });

    wx.setStorageSync('cartArr', cartArr);

    // 增加跳转延迟确保数据保存
    setTimeout(() => {
      wx.switchTab({
        url: '../cart/cart',
        success: () => {
          const page = getCurrentPages().pop();
          if (page) page.onLoad();
        }
      });
    }, 200);
  },

  // 跳转到评论 
  goPinglun() {
    wx.navigateTo({
      url: "../pinglun/pinglun?obj=" + JSON.stringify(this.data.obj)
    })
  }
});