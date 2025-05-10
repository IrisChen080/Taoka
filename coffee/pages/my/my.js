// pages/my/my.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    isShow:'',
    nickName:"",
    img:""
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    
  },

  onShow: function () {
    console.log(wx.getStorageSync('info') );
    const info = wx.getStorageSync('info') || {};
    this.setData({
      nickName: info.nickname,
      img: info.avatar || "/images/tupian.jpg"
    });
  },

// 点击头像上传头像照片
uploadAvatar: function () {
  wx.chooseImage({
    count: 1, // 只选择一张图片
    sizeType: ['original', 'compressed'], // 可以选择原图或压缩图
    sourceType: ['album', 'camera'], // 可以选择相册或者直接使用相机
    success: res => {
      const tempFilePaths = res.tempFilePaths;
      if (tempFilePaths && tempFilePaths.length > 0) {
        // 更新页面数据和本地存储
        this.setData({
          img: tempFilePaths[0]
        });
        const info = wx.getStorageSync('info') || {};
        info.avatar = tempFilePaths[0];
        wx.setStorageSync('info', info);
      }
    },
    fail: err => {
      console.error("选择图片失败", err);
    }
  });
},
  // 我的收藏
   goMyStar(){
    wx.navigateTo({
      url: '../star/star',
    })
  },

  // 管理员登录
  goAdmin(){
    wx.navigateTo({
      url: '../admin/admin',
    })
  },

// 我的奖品
goMyLuck(){
    wx.navigateTo({
      url: '../my_luck/my_luck',
    })
  },

  // 我的订单
  goMyDingdan(){
    wx.navigateTo({
      url: '../dingdan/dingdan',
    })
  },
  goProfile(){
wx.navigateTo({
  url: '../profile/profile',
})
  },
  gSet(){
    wx.navigateTo({
      url: '../set/set',
    })
  },
  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },


})