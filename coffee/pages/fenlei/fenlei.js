// pages/fenlei/fenlei.js
Page({
  data: {
    rightConentList: [],
    leftMenuList: [],
    storeList: [], // 存储门店列表
    storeIndex: 0, // 当前选中门店索引
    currentStoreId: 1, // 当前选中门店ID
    currentIndex: null // 当前选中分类ID
  },

  onLoad: function (options) {
    this.getStores();
  },

  onShow() {
    this.getClassTabs();
  },

  // 获取门店数据（增强API响应处理）
  getStores() {
    wx.showLoading({ title: '加载门店...' })
    wx.request({
      url: 'http://127.0.0.1:5000/store/getStores',
      success: res => {
        if (res.data.code === 200 && res.data.data?.length > 0) {
          // 处理门店数据，确保字段存在并处理格式
          const stores = res.data.data.map(store => {
            return {
              ...store,
              // 格式化地址和电话（如果API返回中有这些字段）
              address: store.address || '暂无地址信息',
              phone: store.phone || store.tel || store.contact || '暂无联系方式'
            };
          });
          
          this.setData({
            storeList: stores,
            currentStoreId: stores[0].store_id,
            storeIndex: 0
          });
          
          // 记录获取到的门店数据
          console.log('获取到门店列表:', stores);
        }
        wx.hideLoading();
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: '门店加载失败', icon: 'none' });
        console.error('门店请求失败:', err);
      }
    });
  },

  // 获取分类列表
  getClassTabs() {
    wx.showLoading({
      title: '加载中...'
    });
    wx.request({
      url: 'http://127.0.0.1:5000/category/getClassTabs',
      success: res => {
        if (res.data.code === 200 && res.data.list?.length > 0) {
          const firstCategoryId = res.data.list[0].fenlei_id;
          this.setData({
            leftMenuList: res.data.list,
            currentIndex: firstCategoryId
          });
          this.getByCategory(firstCategoryId);
        }
        wx.hideLoading();
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('分类请求失败:', err);
      }
    });
  },

  // 获取分类商品（添加store_id参数）
  getByCategory(fenlei_id) {
    wx.showLoading({
      title: '加载中...'
    });
    wx.request({
      url: 'http://127.0.0.1:5000/category/getByCategory',
      method: 'GET',
      data: {
        fenlei_id,
        store_id: this.data.currentStoreId // 添加门店参数
      },
      success: res => {
        if (res.data.code === 200) {
          this.setData({
            rightConentList: res.data.list || []
          });
        }
        wx.hideLoading();
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('商品请求失败:', err);
      }
    });
  },

  // 处理门店选择（更新currentStoreId）
  handleStoreChange(e) {
    const index = e.detail.value;
    const selectedStore = this.data.storeList[index];
    
    if (!selectedStore) return;

    this.setData({
      storeIndex: index,
      currentStoreId: selectedStore.store_id // 更新当前门店ID
    },
    () => {
      this.getByCategory(this.data.currentIndex); // 重新加载数据
    });
  },
  
  handleItemTap(e) {
    const categoryId = e.currentTarget.dataset.id;
    this.setData({
      currentIndex: categoryId
    });
    this.getByCategory(categoryId);
  },

  goDetail(e) {
    const item = e.currentTarget.dataset.obj;
    const storeId = this.data.currentStoreId; // 当前选中门店ID
    console.log('跳转到详情页，商品信息:', item, '门店ID:', storeId);
    
    wx.navigateTo({
      url: `../detail/detail?data=${JSON.stringify(item)}&store_id=${storeId}`
    });
  },
  
  goSearch() {
    wx.navigateTo({
      url: '../search/search',
    });
  },
  
  // 验证购物车商品是否来自同一门店
  validateCartStore(storeId) {
    // 获取购物车
    const cartArr = wx.getStorageSync('cartArr') || [];
    
    // 如果购物车为空，可以添加任何门店的商品
    if (cartArr.length === 0) {
      return true;
    }
    
    // 找出购物车中的门店ID
    const existingStoreIds = cartArr.map(item => item.store_id);
    const uniqueStoreIds = [...new Set(existingStoreIds)];
    
    // 如果已经有多个门店的商品，或者尝试添加的商品与现有商品来自不同门店
    if (uniqueStoreIds.length > 1 || !uniqueStoreIds.includes(storeId)) {
      return false;
    }
    
    return true;
  },
  
  // 清空购物车并添加新商品
  resetCartAndAddProduct(product, storeId, isCheckout = false) {
    // 创建新的购物车数组，只包含当前要添加的商品
    const newCart = [{
      ...product,
      shopNum: 1,
      check: true,
      store_id: storeId
    }];
    
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
  
  // 添加到购物车
  addToCart(e) {
    const product = e.currentTarget.dataset.item;
    const storeId = this.data.currentStoreId;
    
    // 验证购物车门店一致性
    if (!this.validateCartStore(storeId)) {
      // 如果购物车中已有其他门店商品，提示用户
      wx.showModal({
        title: '购物车已有其他门店商品',
        content: '不能同时购买不同门店的商品。是否清空购物车并添加此商品？',
        success: (res) => {
          if (res.confirm) {
            // 用户确认清空购物车
            this.resetCartAndAddProduct(product, storeId);
          }
        }
      });
      return;
    }
    
    // 获取缓存中的购物车数组
    const cartArr = wx.getStorageSync('cartArr') || [];
    
    // 查找是否存在相同商品（同时匹配商品ID和门店ID）
    let index = cartArr.findIndex(item => {
      return item.goods_id == product.goods_id && item.store_id == storeId;
    });
    
    if (index == -1) {
      // 如果商品不存在
      product.shopNum = 1;
      product.check = false;
      product.store_id = storeId; // 确保添加门店ID
      cartArr.push(product);
    } else {
      // 如果商品存在，就将商品数量+1处理
      cartArr[index].shopNum++;
    }
    
    // 将购物车数组存入缓存中
    wx.setStorageSync('cartArr', cartArr);
    wx.showToast({
      title: '添加商品成功！',
      icon: 'success',
      duration: 1000
    });
  },

  // 立即购买功能
  buyNow(e) {
    const product = e.currentTarget.dataset.item;
    const storeId = this.data.currentStoreId;
    
    // 验证购物车门店一致性
    if (!this.validateCartStore(storeId)) {
      // 如果购物车中已有其他门店商品，提示用户
      wx.showModal({
        title: '购物车已有其他门店商品',
        content: '不能同时购买不同门店的商品。是否清空购物车并购买此商品？',
        success: (res) => {
          if (res.confirm) {
            // 用户确认清空购物车并进行购买
            this.resetCartAndAddProduct(product, storeId, true);
          }
        }
      });
      return;
    }
    
    // 获取购物车数据
    const cartArr = wx.getStorageSync('cartArr') || [];
    
    // 查找是否存在相同商品
    const index = cartArr.findIndex(item => 
      item.goods_id == product.goods_id && 
      item.store_id == storeId
    );
    
    if (index == -1) {
      // 不存在则添加新商品
      cartArr.push({
        ...product,
        shopNum: 1,
        check: true, // 设为选中状态
        store_id: storeId
      });
    } else {
      // 存在则增加数量并设为选中
      cartArr[index].shopNum++;
      cartArr[index].check = true;
    }
    
    // 将其他商品设为未选中
    cartArr.forEach(item => {
      if (item.goods_id != product.goods_id || item.store_id != storeId) {
        item.check = false;
      }
    });
    
    // 保存到本地存储
    wx.setStorageSync('cartArr', cartArr);
    
    // 跳转到购物车页面
    setTimeout(() => {
      wx.switchTab({
        url: '../cart/cart',
        success: () => {
          // 刷新购物车页面
          const page = getCurrentPages().pop();
          if (page) page.onLoad();
        }
      });
    }, 200);
  }
});