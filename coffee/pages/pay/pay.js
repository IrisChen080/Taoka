// pages/pay/pay.js
Page({
  data: {
    youhuijuan: "",
    cartArr: [],
    totalPay: 0,
    total: 0,
    show: false,
    showPassword: false,
    payPassword: "",
    checkCartNo: [],
    youhui: "",
    heji: "",
    bianhao: "",
    luck_id: "",
    isTakeout: 0,
    takeoutText: "堂食",
    store_id: "", // 门店 ID
    isLoading: false, // 添加加载状态
    userLevel: "普通", // 用户会员等级
    discount: 1, // 折扣比例，默认无折扣
    originalAmount: 0, // 原价
    discountAmount: 0, // 折扣金额
    showMemberBadge: false // 是否显示会员标识
  },

  onLoad: function (options) {
    let cartArr = wx.getStorageSync('cartArr') || [];
    let checkedCart = cartArr.filter((item) => item.check);
    let checkCartNo = cartArr.filter((item) => !item.check);
    
    let total = 0;
    let totalPay = 0;
    let storeIds = [...new Set(checkedCart.map(item => item.store_id))];
    
    if (storeIds.length > 1) {
      wx.showToast({ title: '请选择同一门店商品', icon: 'none' });
      return;
    }

    checkedCart.forEach((item) => {
      total += parseInt(item.shopNum) || 1;
      totalPay += (parseFloat(item.money) * (parseInt(item.shopNum) || 1));
    });

    // 获取用户信息和会员等级 - 从正确的存储位置获取
    const userInfo = wx.getStorageSync('info') || {};
    const userLevel = userInfo.level || '普通';
    
    console.log("当前用户信息:", userInfo);
    console.log("会员等级:", userLevel);
    
    // 根据会员等级计算折扣
    let discount = 1; // 默认无折扣
    let showMemberBadge = false;
    
    if (userLevel === '钻石') {
      discount = 0.8; // 钻石会员8折
      showMemberBadge = true;
    } else if (userLevel === '黄金') {
      discount = 0.9; // 黄金会员9折
      showMemberBadge = true;
    }
    
    // 计算折扣后的价格
    const originalAmount = totalPay;
    const discountedTotal = (totalPay * discount).toFixed(2);
    const discountAmount = (totalPay - discountedTotal).toFixed(2);

    this.setData({
      total,
      totalPay: discountedTotal,
      originalAmount: originalAmount.toFixed(2),
      discountAmount,
      cartArr: checkedCart,
      checkCartNo,
      store_id: storeIds.length === 1 ? storeIds[0] : "",
      userLevel,
      discount,
      showMemberBadge
    });
  },

  onShow: function () {
    // 计算优惠券和会员折扣后的最终价格
    let yh = wx.getStorageSync("youhuijuan") || 0;
    let discountInfo = "";
    
    // 构建折扣信息
    if (this.data.discount < 1) {
      discountInfo = `会员折扣:￥${this.data.discountAmount}`;
    }
    
    let jiage = parseFloat(this.data.totalPay) - parseInt(yh);
    if (jiage < 0) jiage = 0; // 确保金额不为负
    
    let str = `总价格:￥${this.data.originalAmount}`;
    
    if (this.data.discount < 1 || yh > 0) {
      str += `\n${this.data.userLevel}会员${(this.data.discount * 10).toFixed(0)}折, ${discountInfo}${yh > 0 ? `\n优惠券:￥${yh}` : ''}`;
    }
    
    this.setData({
      youhui: str,
      heji: jiage.toFixed(2),
      youhuijuan: yh,
      bianhao: JSON.stringify(+new Date()).substr(-4),
      takeoutText: this.data.isTakeout === 1 ? "外带" : "堂食"
    });
  },
  
  onClickShow() {
    this.setData({ show: true });
  },

  onClickHide() {
    this.setData({ show: false });
  },

  noop() {
    // 阻止事件冒泡的空函数
  },

  showPasswordInput() {
    this.setData({
      show: false,
      showPassword: true,
      payPassword: "" // 清空密码输入框
    });
  },

  onPasswordOverlayClick() {
    // 阻止密码输入界面的背景点击
  },

  onPasswordInput(e) {
    const value = e.detail.value;
    this.setData({ payPassword: value });
    
    // 如果输入了6位密码，自动提交
    if (value.length === 6) {
      // 可选：延迟一点时间再执行确认，让用户看到6个点都显示了
      setTimeout(() => {
        this.confirmPassword();
      }, 300);
    }
  },

  cancelPassword() {
    this.setData({
      showPassword: false,
      payPassword: ""
    });
  },

  // 确认支付方法
  confirmPassword() {
    if (this.data.isLoading) return; // 防止重复提交
    
    if (!this.data.payPassword) {
      wx.showToast({ title: '请输入支付密码', icon: 'none' });
      return;
    }
    
    if (this.data.payPassword.length < 6) {
      wx.showToast({ title: '请输入完整的6位支付密码', icon: 'none' });
      return;
    }

    this.setData({ isLoading: true });
    
    wx.showLoading({ title: '支付处理中...' });

    // 获取已选择的商品ID用于后续清除购物车
    const selectedItemIds = this.data.cartArr.map(item => {
      // 返回goods_id或product_id，确保有正确的ID
      return item.goods_id || item.product_id;
    }).filter(id => id); // 过滤掉可能的空值
    
    console.log("购物车数据:", this.data.cartArr);
    console.log("已选择商品ID:", selectedItemIds);
    
    // 确保cartArr中的每个项目都有正确的字段
    const orderItems = this.data.cartArr.map(item => {
      const isProduct = !!item.product_id; // 判断是否是陶瓷商品
      
      // 为每个商品添加实际支付金额（应用会员折扣后）
      const originalPrice = parseFloat(item.money);
      const discountedPrice = (originalPrice * this.data.discount).toFixed(2);
      
      return {
        ...item,
        shopNum: item.shopNum || 1,
        // 根据商品类型设置对应的ID
        goods_id: isProduct ? null : item.goods_id,
        product_id: isProduct ? item.product_id : null,
        originalPrice: originalPrice,
        discountedPrice: discountedPrice,
        money: discountedPrice // 使用折扣后的价格作为实际支付价格
      };
    });
    
    // 提交订单请求
    wx.request({
      url: 'http://127.0.0.1:5000/order/addDingdan',
      method: 'GET', // 确保使用GET方法
      data: {
        dingdanArr: JSON.stringify(orderItems),
        tel: wx.getStorageSync('tel'),
        bianhao: this.data.bianhao,
        isTakeout: this.data.isTakeout,
        store_id: this.data.store_id,
        // 添加会员折扣信息
        userLevel: this.data.userLevel,
        discount: this.data.discount,
        originalAmount: this.data.originalAmount,
        discountedAmount: this.data.totalPay
      },
      header: { 'content-type': 'application/x-www-form-urlencoded' },
      success: (res) => {
        wx.hideLoading();
        this.setData({ 
          showPassword: false,
          isLoading: false 
        });
        
        if (res.data && res.data.code === 200) {
          // 保存已购买商品的ID用于清除购物车
          wx.setStorageSync('purchasedItems', selectedItemIds);
          // 设置支付成功标记
          wx.setStorageSync('paymentSuccess', true);
          
          // 更新购物车 - 仅保留未选中的商品
          wx.setStorageSync('cartArr', this.data.checkCartNo);
          wx.setStorageSync('youhuijuan', "");
          
          wx.showToast({
            title: '支付成功！',
            icon: 'success',
            duration: 1500,
            mask: true,
            success: () => {
              // 跳转到订单页面
              setTimeout(() => {
                wx.navigateTo({ url: '../dingdan/dingdan' });
              }, 1500);
            }
          });
        } else {
          wx.showToast({ 
            title: res.data?.msg || '订单提交失败', 
            icon: 'none' 
          });
        }
      },
      fail: (err) => {
        console.error("订单提交失败:", err);
        wx.hideLoading();
        this.setData({ isLoading: false });
        wx.showToast({ title: '支付失败，请重试', icon: 'none' });
      }
    });
  },

  toggleTakeout(e) {
    const type = parseInt(e.currentTarget.dataset.type, 10);
    this.setData({
      isTakeout: type,
      takeoutText: type === 1 ? "外带" : "堂食"
    });
  },

  goLuck() {
    wx.setStorageSync('index', 1);
    wx.navigateTo({ url: '../my_luck/my_luck' });
  }
});