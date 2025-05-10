// pages/dingdan/dingdan.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    dataList: [],
    historyList: [], // 添加历史订单列表
    index: 0,
    storeList: [] // 门店列表
  },
  
  onUnload: function() {
    // 如果首页是 tabBar 页面
    wx.switchTab({
      url: '/pages/my/my'
    });
  },
  
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 获取门店列表
    this.getStoreList();
  },

  // 获取门店列表
  getStoreList() {
    wx.request({
      url: 'http://127.0.0.1:5000/store/getStores',
      success: res => {
        if (res.data.code === 200) {
          this.setData({
            storeList: res.data.data
          });
          // 刷新订单列表，以便显示门店名称
          this.getData("getChucan");
        }
      }
    });
  },

  // 获取门店名称
  getStoreName(storeId) {
    if (!storeId) return '未知门店';
    const store = this.data.storeList.find(s => s.store_id === parseInt(storeId));
    return store ? store.store_name : '未知门店';
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.getData("getChucan");
  },
  
  // 跳转到评价
  pingjia(e){
    wx.navigateTo({
      url: '../add_pinglun/add_pinglun?obj='+JSON.stringify(e.currentTarget.dataset.obj)
    })
  },

  // 切换
  onChange(e){
    console.log(e.detail.name);
    this.setData({
      index: e.detail.name
    });
    
    if(this.data.index==0){
      // 获取待出餐的数据
      this.getData("getChucan");
    }else if(this.data.index==1){
      // 获取待确认的数据
      this.getData("getQueren");
    }else if(this.data.index==2){
      // 获取待评价的数据
      this.getData("getPingjia");
    }else if(this.data.index==3){
      // 获取历史订单数据
      this.getHistoryOrders();
    }
  },

  // 获取历史订单
  getHistoryOrders() {
    wx.showLoading({ title: '加载中...' });
    
    // 优先从tel存储获取，如果没有则尝试从info对象中获取
    const userTel = wx.getStorageSync("tel") || (wx.getStorageSync("info") ? wx.getStorageSync("info").tel : "");
    
    // 添加日志，方便调试
    console.log("当前用户电话(历史订单):", userTel);
    
    if (!userTel) {
      wx.hideLoading();
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    wx.request({
      url: 'http://127.0.0.1:5000/order/myDingdan',
      data: { tel: userTel },
      header: { 'content-type': 'application/json' },
      success: res => {
        console.log("历史订单查询结果:", res.data);
        
        if (res.data.code === 200 && res.data.list) {
          // 筛选已评价的订单
          const historyOrders = res.data.list
            .filter(order => order.active === '1')
            .map(order => ({
              ...order,
              storeName: this.getStoreName(order.store_id),
              // 确保shopNum是数字
              shopNum: parseInt(order.shopNum || 1)
            }));
          
          this.setData({ historyList: historyOrders });
        }
        wx.hideLoading();
      },
      fail: (err) => {
        console.error("请求失败:", err);
        wx.hideLoading();
        wx.showToast({ title: '获取历史订单失败', icon: 'none' });
      }
    });
  },

  // 获取我的订单
  getData(name) {
    wx.showLoading({
      title: '加载中...',
    })
    
    // 优先从tel存储获取，如果没有则尝试从info对象中获取
    const userTel = wx.getStorageSync("tel") || (wx.getStorageSync("info") ? wx.getStorageSync("info").tel : "");
    
    // 添加日志，方便调试
    console.log("当前用户电话:", userTel);
    
    if (!userTel) {
      wx.hideLoading();
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    wx.request({
      url: `http://127.0.0.1:5000/order/${name}`,
      data: {
        tel: userTel,
      },
      header: {
        'content-type': 'application/json' 
      },
      success: res => {
        console.log(`${name}查询结果:`, res.data);
        
        if (res.data.code === 200 && res.data.list) {
          let orderList = res.data.list;
          
          // 如果是待评价列表，只显示未评价的订单
          if (name === "getPingjia") {
            orderList = orderList.filter(order => order.active === '0');
          }
          
          // 为每个订单添加门店名称并处理数量为数字类型
          orderList = orderList.map(order => {
            return {
              ...order,
              storeName: this.getStoreName(order.store_id),
              // 确保shopNum是数字
              shopNum: parseInt(order.shopNum || 1)
            };
          });
          
          // 添加日志以便调试
          console.log('处理后的订单列表:', orderList);
          
          this.setData({
            dataList: orderList
          });
        } else {
          this.setData({
            dataList: []
          });
        }
        wx.hideLoading();
      },
      fail: (err) => {
        console.error("请求失败:", err);
        wx.hideLoading();
        wx.showToast({
          title: '获取订单失败',
          icon: 'none'
        });
      }
    });
  },

  // 取消订单
  del(e) {
    console.log(e.currentTarget.dataset);
    const money = e.currentTarget.dataset.price;
    wx.showModal({
      title: "提示",
      content: "确认要取消吗",
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: "拼命加载中...",
          });
          setTimeout(() => {
            wx.hideLoading();
            wx.showModal({
              title: "< 订单已取消 >",
              content: "您的订单已取消，期待再次光临\n\n退款成功 " + money + " 元 >",
              showCancel: false,
              success: () => {
                wx.request({
                  url: `http://127.0.0.1:5000/order/delOrder`,
                  data: {
                    dingdan_id: e.currentTarget.dataset.id,
                  },
                  header: {
                    "content-type": "application/json",
                  },
                  success: (res) => {
                    console.log(res.data);
                    this.getData("getChucan");
                  },
                });
              },
            });
          }, 1200);
        } else if (res.cancel) {
          console.log("用户点击取消");
        }
      },
    });
  },

  // 确认订单
  addQueren(e){
    console.log(e.currentTarget.dataset.id);
    wx.showModal({
      title: '温馨提示',
      content: '确认之后代表订单完成！',
      success:(res)=> {
        if (res.confirm) {
          wx.showLoading({
            title: '拼命加载中...',
          })
          setTimeout(()=>{
            wx.hideLoading()
            wx.showModal({
              title: '提示',
              content:"操作成功！",
              showCancel:false,
              success:()=>{
                wx.request({
                  url: `http://127.0.0.1:5000/order/updateQueren`,
                  data: {
                    dingdan_id:e.currentTarget.dataset.id,
                  },
                  header: {
                    'content-type': 'application/json' 
                  },
                  success:res=> {
                    console.log(res.data)
                    this.getData("getQueren")
                  }
                })
              }
            })
          },1200)
        } else if (res.cancel) {
          console.log('用户点击取消')
        }
      }
    })
  },
})