import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

// 定义路由与权限的映射关系
const routePermissions = {
  '/users': ['admin', 'manager', 'staff'],
  '/list': ['admin', 'manager', 'staff'],
  '/order': ['admin', 'manager', 'staff'],
  '/pinglun': ['admin', 'manager', 'staff'],
  '/add': ['admin', 'manager', 'staff'],
  '/gonggao': ['admin'],
  '/fenlei': ['admin', 'manager'],
  '/stores': ['admin'],
  '/staff': ['admin', 'manager'],
  '/goods': ['admin', 'manager', 'staff'],
  '/welcome': ['admin', 'manager', 'staff'] // 仍然保留欢迎页的权限配置
}

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: ()=> import('../components/Login.vue') },
  { path: '/403', component: ()=> import('../views/403.vue') }, // 403权限不足页面
  {
    path: '/home',
    component: ()=> import('../views/Home.vue'),
    // 移除重定向到welcome
    children: [
      {
        path: '/welcome',
        component: ()=> import('../components/Welcome.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/users',
        component: ()=> import('../components/Users.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/list',
        component: ()=> import('../components/List.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/order',
        component: ()=> import('../components/Order.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/pinglun',
        component: ()=> import('../components/Pinglun.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/add',
        component: ()=> import('../components/Add.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/gonggao',
        component: ()=> import('../components/Gonggao.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/fenlei',
        component: ()=> import('../components/Fenlei.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/stores',
        component: ()=> import('../components/Stores.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/staff',
        component: ()=> import('../components/staff.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/goods',
        component: ()=> import('../components/goods.vue'),
        meta: { requiresAuth: true }
      },
    ]
  }
]

const router = new VueRouter({
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 登录页面和403页面直接放行
  if (to.path === '/login' || to.path === '/403') {
    next()
    return
  }

  // 从本地存储获取登录信息
  const staffInfoStr = localStorage.getItem('staffInfo')
  
  // 未登录时跳转到登录页
  if (!staffInfoStr) {
    next('/login')
    return
  }

  // 获取用户信息
  const staffInfo = JSON.parse(staffInfoStr)
  const userRole = staffInfo.role || 'staff' // 使用role字段

  // 如果路径是/home，直接放行，不进行重定向
  if (to.path === '/home') {
    next()
    return
  }

  // 检查是否需要权限验证
  if (to.meta && to.meta.requiresAuth) {
    // 判断当前用户是否有访问该路由的权限
    if (hasRoutePermission(to.path, userRole)) {
      next() // 有权限，放行
    } else {
      next('/403') // 无权限，导向403页面
    }
  } else {
    next() // 不需要权限的页面直接放行
  }
})

// 判断用户是否有访问某路由的权限
function hasRoutePermission(routePath, userRole) {
  // 如果路由没有在权限表中定义，默认允许访问
  if (!routePermissions[routePath]) {
    return true
  }
  
  // 检查用户角色是否在该路由的允许角色列表中
  return routePermissions[routePath].includes(userRole)
}

export default router