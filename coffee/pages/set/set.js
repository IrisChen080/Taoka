// pages/set/set.js
Page({

  /**
   * 页面的初始数据
   */
  data: {

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

  },

  // 个人信息
  goPerson(){
    wx.navigateTo({
      url: '../profile/profile',
    })
  },

  // 退出
  tuichu(){
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success (res) {
        if (res.confirm) {
          // 清除登录信息
          wx.clearStorageSync();
          wx.reLaunch({
            url: "/pages/login/login"
          });
        } else if (res.cancel) {
          console.log('用户点击取消')
        }
      }
    })
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },


})