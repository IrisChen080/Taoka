Page({
  data: {
    userInfo: {},
    genderIndex: 0
  },
  
  onLoad() {
    this.fetchUserData();
  },
  
  // 从后端获取用户数据
  fetchUserData() {
    const userInfo = wx.getStorageSync('info');
    if (!userInfo || !userInfo.user_id) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    wx.request({
      url: 'http://localhost:5000/user/getUserInfo',
      method: 'GET',
      data: { id: userInfo.user_id },
      success: (res) => {
        if (res.statusCode === 200 && res.data.userInfo) {
          const userData = res.data.userInfo;
          // 格式化生日日期
          if (userData.birthday) {
            userData.birthday = userData.birthday.split('T')[0];
          }
          
          this.setData({
            userInfo: userData,
            genderIndex: userData.xingbie === '男' ? 0 : 1
          });
        } else {
          wx.showToast({
            title: '获取用户信息失败',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },
  
  // 表单事件处理
  onNicknameChange(e) {
    this.setData({ 'userInfo.nickname': e.detail.value });
  },
  
  onGenderChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      'userInfo.xingbie': index === 0 ? '男' : '女',
      genderIndex: index
    });
  },
  
  onBirthdayChange(e) {
    this.setData({ 'userInfo.birthday': e.detail.value });
  },
  
  onTelChange(e) {
    this.setData({ 'userInfo.tel': e.detail.value });
  },
  
  // 保存用户信息
  onSave() {
    // 准备要发送的数据
    const { tel, nickname, xingbie, birthday } = this.data.userInfo;
    
    // 验证必填字段
    if (!tel || !nickname) {
      wx.showToast({
        title: '手机号和昵称不能为空',
        icon: 'none'
      });
      return;
    }
    
    // 发送修改请求
    wx.request({
      url: 'http://localhost:5000/user/xgUser',
      method: 'PUT',
      header: { 'Content-Type': 'application/json' },
      data: {
        tel,
        nickname,
        xingbie,
        birthday
      },
      success: (res) => {
        if (res.statusCode === 200) {
          wx.showToast({ 
            title: '保存成功',
            icon: 'success'
          });
          
          // 更新本地存储的用户信息
          const info = wx.getStorageSync('info');
          info.nickname = nickname;
          wx.setStorageSync('info', info);
          
          // 刷新数据
          this.fetchUserData();
        } else {
          wx.showToast({ 
            title: res.data.msg || '保存失败', 
            icon: 'none' 
          });
        }
      },
      fail: (err) => {
        console.error('请求失败:', err);
        wx.showToast({ 
          title: '网络错误', 
          icon: 'none' 
        });
      }
    });
  }
});