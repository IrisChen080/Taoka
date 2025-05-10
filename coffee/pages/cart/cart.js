// pages/cart/cart.js
Page({
  data: {
    cartArr: [],
    allCheck: true,
    totalPrice: 0,
    totalNum: 0,
    storeName: '', // 添加显示门店名称
    storeStatus: '营业中' // 添加门店状态字段
  },

  onShow() {
    // 检查是否有支付成功标记
    const paymentSuccess = wx.getStorageSync('paymentSuccess');
    if (paymentSuccess) {
      this.clearPurchasedItems();
      // 清除支付成功标记
      wx.removeStorageSync('paymentSuccess');
    }
    
    this.loadCartData();
  },

  loadCartData() {
    // 清除门店缓存，强制重新获取
    wx.removeStorageSync('storeCache');
    
    const cartArr = wx.getStorageSync('cartArr') || [];
    const cartWithValidStore = cartArr.filter(item => item.store_id);
    
    // 获取唯一的门店ID
    const storeIds = [...new Set(cartWithValidStore.map(item => item.store_id))];
    
    // 如果有门店ID，始终从服务器获取最新状态
    if (storeIds.length === 1) {
      const storeId = storeIds[0];
      
      // 始终从服务器获取门店信息
      wx.request({
        url: 'http://127.0.0.1:5000/store/getStores',
        success: (res) => {
          if (res.data.code === 200 && res.data.data) {
            const storeInfo = res.data.data.find(store => store.store_id == storeId);
            if (storeInfo) {
              const storeName = storeInfo.store_name;
              const storeStatus = storeInfo.status || '营业中';
              
              console.log("门店状态: ", storeStatus); // 调试用
              
              // 更新UI
              this.setData({ 
                storeName,
                storeStatus
              });
              
              // 更新缓存
              const storeCache = {};
              storeCache[storeId] = {
                name: storeName,
                status: storeStatus
              };
              wx.setStorageSync('storeCache', storeCache);
            }
          }
        }
      });
    }
    
    this.setCart(cartWithValidStore);
  },

  // 清除已购买的商品
  clearPurchasedItems() {
    // 获取选中的商品ID
    const cartArr = wx.getStorageSync('cartArr') || [];
    const purchasedItems = wx.getStorageSync('purchasedItems') || [];
    
    if (purchasedItems.length > 0) {
      // 过滤掉已购买的商品
      const updatedCart = cartArr.filter(item => !purchasedItems.includes(item.goods_id));
      // 更新本地存储
      wx.setStorageSync('cartArr', updatedCart);
      // 清除已购买商品的记录
      wx.removeStorageSync('purchasedItems');
      
      // 显示提示
      wx.showToast({
        title: '已清除已购买商品',
        icon: 'success',
        duration: 1500
      });
    }
  },

  handlePay() {
    // 检查门店是否休息中
    if (this.data.storeStatus === '休息中') {
      wx.showModal({
        title: '提交失败',
        content: '门店已歇业',
        showCancel: false
      });
      return;
    }

    const selectedItems = this.data.cartArr.filter(item => item.check);

    if (selectedItems.length === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' });
      return;
    }

    const storeIds = [...new Set(selectedItems.map(item => item.store_id))];
    if (storeIds.length === 0) {
      wx.showToast({ title: '商品缺少门店信息', icon: 'none' });
      return;
    }
    
    if (storeIds.length > 1) {
      wx.showModal({
        title: '无法结算',
        content: '您选择了来自不同门店的商品，请仅选择同一门店的商品进行结算',
        showCancel: false
      });
      return;
    }

    // 保存选中的商品ID，用于支付成功后清除
    const selectedItemIds = selectedItems.map(item => item.goods_id);
    wx.setStorageSync('pendingPurchaseItems', selectedItemIds);

    wx.navigateTo({
      url: `../pay/pay?store_id=${storeIds[0]}&total=${this.data.totalPrice}`
    });
  },

  checkedChange(e) {
    let id = e.currentTarget.dataset.id;
    let { cartArr } = this.data;
    let index = cartArr.findIndex(item => item.goods_id === id);

    if (index === -1) return; // 避免 index 为 -1 出错

    cartArr[index].check = !cartArr[index].check;
    this.setCart(cartArr);
  },

  allCheckedChange() {
    let { cartArr, allCheck } = this.data;
    allCheck = !allCheck;
    cartArr.forEach(item => (item.check = allCheck));
    this.setData({ allCheck });
    this.setCart(cartArr);
  },

  operationGoods(e) {
    let { cartArr } = this.data;
    let { id, operation } = e.currentTarget.dataset;
    let index = cartArr.findIndex(item => item.goods_id == id);

    if (index === -1) return; // 避免找不到商品时出错

    if (cartArr[index].shopNum === 1 && operation === -1) {
      wx.showModal({
        title: '提示',
        content: '您是否要删除该商品',
        success: (res) => {
          if (res.confirm) {
            cartArr.splice(index, 1);
            this.setCart(cartArr);
          }
        }
      });
    } else {
      cartArr[index].shopNum = Math.max(1, (cartArr[index].shopNum || 1) + operation);
      this.setCart(cartArr);
    }
  },

  setCart(cartArr) {
    const allCheck = cartArr.length > 0 ? cartArr.every(item => item.check) : false;
    let totalNum = 0;
    let totalPrice = 0;

    cartArr.forEach(item => {
      if (item.check) {
        totalNum += item.shopNum || 0;
        totalPrice += (item.money || 0) * (item.shopNum || 0);
      }
    });

    this.setData({
      cartArr,
      allCheck,
      totalPrice,
      totalNum,
    });

    wx.setStorageSync('cartArr', cartArr);
  }
});