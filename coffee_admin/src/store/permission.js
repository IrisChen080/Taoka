// store/permission.js
const permissionStore = {
  namespaced: true, // 启用命名空间
  state: {
    userRole: '', // 角色: 'admin', 'manager', 'staff'
    userStoreId: null, // 门店ID
    permissions: {
      // 店主（超级管理员）
      admin: [
        'users',      // 会员管理
        'goods',      // 商品管理
        'list',       // 菜单管理
        'stores',     // 门店管理
        'staff',      // 员工管理 
        'fenlei',     // 菜单分类管理
        'order',      // 订单管理
        'pinglun',    // 评论管理
        'gonggao'     // 公告管理
      ],
      // 店长（分门店）
      manager: [
        'users',      // 会员管理
        'goods',      // 商品管理
        'list',       // 菜单管理
        'staff',      // 员工管理
        'fenlei',     // 菜单分类管理
        'order',      // 订单管理
        'pinglun'     // 评论管理
      ],
      // 店员（分门店）
      staff: [
        'users',      // 会员管理
        'goods',      // 商品管理
        'list',       // 菜单管理
        'order',      // 订单管理
        'pinglun'     // 评论管理
      ]
    }
  },
  mutations: {
    // 设置用户角色
    SET_USER_ROLE(state, role) {
      state.userRole = role
      // 保存到本地存储，刷新后仍可用
      localStorage.setItem('userRole', role)
    },
    // 设置用户门店ID
    SET_USER_STORE_ID(state, storeId) {
      state.userStoreId = storeId
      // 保存到本地存储，刷新后仍可用
      localStorage.setItem('userStoreId', storeId)
    },
    // 从本地存储恢复权限数据
    RESTORE_PERMISSION_STATE(state) {
      const userRole = localStorage.getItem('userRole')
      const userStoreId = localStorage.getItem('userStoreId')
      
      if (userRole) {
        state.userRole = userRole
      }
      
      if (userStoreId) {
        state.userStoreId = parseInt(userStoreId) || null
      }
    }
  },
  actions: {
    // 简化的恢复权限信息action
    restorePermissionInfo({ commit }) {
      commit('RESTORE_PERMISSION_STATE')
    }
  },
  getters: {
    // 获取当前用户可访问的权限
    accessiblePermissions: state => {
      return state.permissions[state.userRole] || []
    },
    // 判断是否有访问某功能的权限
    hasPermission: state => permissionName => {
      if (!state.userRole || !permissionName) return false
      return state.permissions[state.userRole].includes(permissionName)
    },
    // 获取用户角色
    userRole: state => state.userRole,
    // 获取用户门店ID
    userStoreId: state => state.userStoreId,
    // 是否是店主
    isAdmin: state => state.userRole === 'admin',
    // 是否是店长
    isManager: state => state.userRole === 'manager',
    // 是否是店员
    isStaff: state => state.userRole === 'staff'
  }
}

export default permissionStore