import Vue from 'vue'
import Vuex from 'vuex'
import permissionStore from './permission'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    // 全局状态...
  },
  mutations: {
    // 全局mutations...
  },
  actions: {
    // 全局actions...
  },
  modules: {
    permission: permissionStore
    // 其他模块...
  }
})