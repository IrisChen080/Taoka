Page({
  data: {
    userInfo: {
      tel: '',
      user: '',
      paw: '',
      paws: ''
    }
  },

  // 手机号输入
  getTel(e) {
    this.setData({ 'userInfo.tel': e.detail.value });
  },

  // 用户名输入
  getUser(e) {
    this.setData({ 'userInfo.nickname': e.detail.value });
  },

  // 密码输入
  getPaw(e) {
    this.setData({ 'userInfo.paw': e.detail.value });
  },

  // 确认密码输入
  getPaws(e) {
    this.setData({ 'userInfo.paws': e.detail.value });
  },

  // 注册逻辑
  login() {
    const { tel, nickname, paw, paws } = this.data.userInfo;
    
    // 表单验证
    if (!tel || !nickname || !paw || !paws) {
      return wx.showToast({ title: '信息不能为空', icon: 'none' });
    }
    if (!/^1[3-9]\d{9}$/.test(tel)) {
      return wx.showToast({ title: '手机号格式错误', icon: 'none' });
    }
    if (paw !== paws) {
      return wx.showToast({ title: '两次密码不一致', icon: 'none' });
    }

    // 发送注册请求
    wx.request({
      url: 'http://127.0.0.1:5000/user/register',
      data: { tel, nickname, paw },
      success: res => {
        if (res.data.code === 200) {
          wx.showToast({ title: '注册成功' });
          setTimeout(() => wx.navigateTo({ url: '/pages/login/login' }), 1500);
        } else {
          wx.showToast({ title: res.data.msg, icon: 'none' });
        }
      },
      fail: () => wx.showToast({ title: '网络错误', icon: 'none' })
    });
  },

  // 跳转登录
  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  }
});