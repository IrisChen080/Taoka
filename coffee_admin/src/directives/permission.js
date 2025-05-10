import store from '../store'

// 自定义权限指令
export default {
  // 指令绑定时调用
  bind(el, binding) {
    // 获取指令的值，即所需权限
    const permission = binding.value
    
    // 检查当前用户是否有权限
    const hasPermission = store.getters['permission/hasPermission'](permission)
    
    // 如果没有权限，则隐藏元素
    if (!hasPermission) {
      if (el.parentNode) {
        el.parentNode.removeChild(el)
      } else {
        el.style.display = 'none'
      }
    }
  }
}