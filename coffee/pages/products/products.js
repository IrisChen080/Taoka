// Updated products.js with proper data handling and info display
Page({
  data: {
    products: [],
    storeList: [],
    storeIndex: 0,
    currentStoreId: null // 当前门店ID存储
  },

  onLoad: function (options) {
    this.getStores();
  },

  onShow() {
    // 添加日志确认生命周期触发
    console.log('onShow triggered, currentStoreId:', this.data.currentStoreId);
    
    if (this.data.currentStoreId) {
      this.getProducts(this.data.currentStoreId); // 明确传递参数
    } else {
      // 如果门店ID丢失，重新获取默认门店
      this.getStores();
    }
  },

  // 获取门店数据（修正返回字段）
  getStores() {
    wx.showLoading({ title: '加载门店...' });
    wx.request({
      url: 'http://127.0.0.1:5000/store/getStores',
      success: (res) => {
        console.log('门店API返回:', res.data);
        if (res.data.code === 200 && res.data.data?.length > 0) {
          // 预处理门店数据，添加必要字段
          const storeList = res.data.data.map(item => ({
            name: item.store_name,
            id: item.store_id,
            address: item.address || '暂无地址信息',
            phone: item.phone || item.tel || item.contact || '暂无联系方式'
          }));
          
          this.setData({
            storeList,
            storeIndex: 0,
            currentStoreId: storeList[0].id // 确保默认选中第一个门店
          });

          // 立即加载商品数据
          this.getProducts(storeList[0].id);
        } else {
          wx.showToast({ 
            title: '暂无门店数据', 
            icon: 'none' 
          });
        }
      },
      fail: (err) => {
        wx.showToast({ title: '门店加载失败', icon: 'none' });
        console.error('门店请求失败:', err);
      },
      complete: () => wx.hideLoading()
    });
  },

  // 获取商品数据
  getProducts(storeId) {
    if (!storeId) {
      console.error('storeId is undefined');
      return;
    }
  
    wx.showLoading({ title: '加载中...' });
    
    // 调试日志
    console.log('正在获取门店商品，门店ID:', storeId);
    
    // 修正：使用正确的API端点和处理数据结构
    wx.request({
      url: 'http://127.0.0.1:5000/product/withStock',
      data: { store_id: storeId },
      success: (res) => {
        console.log('API返回原始数据:', res.data);
        
        if (res.data.code === 200) {
          // 修正：根据你的后端API，数据在 data 属性中
          const productList = res.data.data || [];
          
          // 日志记录获取到的商品数量
          console.log(`成功获取${productList.length}个商品`);
          
          // 数据转换：将后端字段映射为前端需要的字段
          const formattedProducts = productList.map(item => ({
            goods_id: item.id,
            title: item.name,
            money: item.price,
            img: item.image,
            ingredients: item.description,
            stock: item.stock,
            status: item.status,
            store_id: storeId
          }));
          
          // 检查结构并确保关键字段存在
          if (formattedProducts.length > 0) {
            console.log('格式化后商品示例:', formattedProducts[0]);
          }
          
          this.setData({
            products: formattedProducts
          });
        } else {
          console.error('API返回错误码:', res.data.code);
          wx.showToast({ title: '数据加载失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('API请求失败:', err);
        wx.showToast({ title: '网络请求失败', icon: 'none' });
      },
      complete: () => wx.hideLoading()
    });
  },

  // 修正：正确传递门店ID到详情页
  goDetail(e) {
    const productInfo = e.currentTarget.dataset.info;
    const storeId = this.data.currentStoreId;
    
    console.log('跳转到详情页，商品信息:', productInfo, '门店ID:', storeId);
    
    // 确保商品信息中包含门店ID
    const product = {
      ...productInfo,
      store_id: storeId
    };
    
    wx.navigateTo({
      url: `../detail/detail?data=${JSON.stringify(product)}&store_id=${storeId}`
    });
  },
  
  addCart(e) {
    const product = e.currentTarget.dataset.product;
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
    let index = cartArr.findIndex(item => 
      item.goods_id == product.goods_id && item.store_id == storeId
    );
    
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
  
  // 处理门店选择变化
  handleStoreChange(e) {
    const index = e.detail.value;
    const selectedStore = this.data.storeList[index];
    
    if (!selectedStore || !selectedStore.id) {
      console.error('选择的门店数据不正确:', selectedStore);
      wx.showToast({ title: '门店数据错误', icon: 'none' });
      return;
    }
    
    this.setData({
      storeIndex: index,
      currentStoreId: selectedStore.id
    });
    
    console.log('门店已切换，当前门店ID:', selectedStore.id);
    this.getProducts(selectedStore.id); // 重新加载商品
  },

  // 新增：检查购物车中的商品是否都来自同一门店
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
  
  // 更新：立即购买功能（增加门店验证）
  buyNow(e) {
    const product = e.currentTarget.dataset.product;
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
      item.goods_id === product.goods_id && 
      item.store_id === storeId
    );
    
    if (index === -1) {
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
      if (item.goods_id !== product.goods_id || item.store_id !== storeId) {
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