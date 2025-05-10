import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
// 导入全局样式表
import './assets/css/global.css'
// 导入字体图标
import './assets/fonts/iconfont.css'
// 引入element-ui
import ElementUI from 'element-ui';  
import 'element-ui/lib/theme-chalk/index.css';

import VueParticles from 'vue-particles'  // 引入背景粒子插件

import axios from 'axios'       // 引入axios

// 导入自定义权限指令
import permission from './directives/permission'

// 注册权限指令
Vue.directive('permission', permission)

Vue.use(ElementUI)

// 配置请求的根路径
axios.defaults.baseURL = 'http://127.0.0.1:5000/'  // 定义公共接口

// 添加请求拦截器
axios.interceptors.request.use(config => {
  // 在请求头中添加token
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  // 门店数据过滤 - 如果不是店主且请求特定API，添加storeId参数
  const userRole = localStorage.getItem('userRole')
  const userStoreId = localStorage.getItem('userStoreId')
  
  if (userRole !== 'admin' && userStoreId) {
    // 需要过滤的API列表
    const filterApis = [
      '/goods', '/list', '/order', '/staff', '/pinglun'
    ]
    
    const url = config.url
    if (filterApis.some(api => url && url.includes(api))) {
      if (!config.params) {
        config.params = {}
      }
      if (!config.params.storeId) {
        config.params.storeId = userStoreId
      }
    }
  }
  
  return config
}, error => {
  return Promise.reject(error)
})

// 添加响应拦截器
axios.interceptors.response.use(response => {
  return response
}, error => {
  if (error.response && error.response.status === 401) {
    // 未授权，清除登录信息并跳转到登录页
    localStorage.removeItem('token')
    localStorage.removeItem('staffInfo')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userStoreId')
    router.push('/login')
    ElementUI.Message.error('登录已过期，请重新登录')
  }
  return Promise.reject(error)
})

Vue.prototype.$http = axios   // 将axios 全局挂载 vue 实例上

Vue.config.productionTip = false

Vue.use(ElementUI);
Vue.use(VueParticles)

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')