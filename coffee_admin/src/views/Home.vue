<template>
  <el-container class="home-container">
    <!-- 头部区域 -->
    <el-header>
      <div>
        <img src="../assets/logo.png" alt="" />
        <span>咖啡后台管理系统</span>
      </div>
      <div class="user-info">
        <el-dropdown trigger="click" @command="handleCommand">
          <span class="el-dropdown-link">
            {{ getUserName() }} <i class="el-icon-arrow-down el-icon--right"></i>
          </span>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="userInfo">
              <i class="el-icon-user"></i> 个人信息
            </el-dropdown-item>
            <el-dropdown-item command="logout" divided>
              <i class="el-icon-switch-button"></i> 退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </div>
    </el-header>
    <!-- 页面主体区域 -->
    <el-container>
      <!-- 侧边栏 -->
      <el-aside :width="isCollapse ? '64px' : '200px'">
        <div class="toggle-button" @click="toggleCollapse">|||</div>
        <!-- 侧边栏菜单区域 -->
        <el-menu
          background-color="#333744"
          text-color="#fff"
          active-text-color="#409EFF"
          unique-opened
          :collapse="isCollapse"
          :collapse-transition="false"
          router
          :default-active="activePath"
        >
          <!-- 会员管理 - 所有角色都可见 -->
          <el-submenu index="1" v-if="hasPermission('users')">
            <template slot="title">
              <i class="iconfont icon-user"></i>
              <span>会员管理</span>
            </template>
            <el-menu-item index="/users" @click="saveNavState('/users')">
              <template slot="title">
                <i class="el-icon-user"></i>
                <span>账号管理</span>
              </template>
            </el-menu-item>
          </el-submenu>

          <!-- 商品管理 - 所有角色都可见 -->
          <el-submenu index="2" v-if="hasPermission('goods')">
            <template slot="title">
              <i class="el-icon-goods"></i>
              <span>商品管理</span>
            </template>
            <el-menu-item index="/goods" @click="saveNavState('/goods')">
              <template slot="title">
                <i class="el-icon-menu"></i>
                <span>商品列表</span>
              </template>
            </el-menu-item>
          </el-submenu>

          <!-- 菜单管理 - 所有角色都可见 -->
          <el-submenu index="3" v-if="hasPermission('list')">
            <template slot="title">
              <i class="iconfont icon-danju"></i>
              <span>菜单管理</span>
            </template>
            <el-menu-item index="/list" @click="saveNavState('/list')">
              <template slot="title">
                <i class="el-icon-menu"></i>
                <span>菜单列表</span>
              </template>
            </el-menu-item>
          </el-submenu>

          <!-- 门店管理 - 仅店主可见 -->
          <el-submenu index="4" v-if="hasPermission('stores')">
            <template slot="title">
              <i class="el-icon-office-building"></i>
              <span>门店管理</span>
            </template>
            <el-menu-item index="/stores" @click="saveNavState('/stores')">
              <template slot="title">
                <i class="el-icon-location"></i>
                <span>门店列表</span>
              </template>
            </el-menu-item>
          </el-submenu>

          <!-- 员工管理 - 店主和店长可见 -->
          <el-submenu index="5" v-if="hasPermission('staff')">
            <template slot="title">
              <i class="el-icon-s-custom"></i>
              <span>员工管理</span>
            </template>
            <el-menu-item index="/staff" @click="saveNavState('/staff')">
              <template slot="title">
                <i class="el-icon-notebook-2"></i>
                <span>员工列表</span>
              </template>
            </el-menu-item>
          </el-submenu>

          <!-- 菜单分类管理 - 店主和店长可见 -->
          <el-submenu index="6" v-if="hasPermission('fenlei')">
            <template slot="title">
              <i class="el-icon-document"></i>
              <span>菜单分类管理</span>
            </template>
            <el-menu-item index="/fenlei" @click="saveNavState('/fenlei')">
              <template slot="title">
                <i class="el-icon-menu"></i>
                <span>菜单列表</span>
              </template>
            </el-menu-item>
          </el-submenu>

          <!-- 订单管理 - 所有角色都可见 -->
          <el-submenu index="7" v-if="hasPermission('order')">
            <template slot="title">
              <i class="el-icon-document"></i>
              <span>订单管理</span>
            </template>
            <el-menu-item index="/order" @click="saveNavState('/order')">
              <template slot="title">
                <i class="el-icon-menu"></i>
                <span>订单列表</span>
              </template>
            </el-menu-item>
          </el-submenu>

          <!-- 评论管理 - 所有角色都可见 -->
          <el-submenu index="8" v-if="hasPermission('pinglun')">
            <template slot="title">
              <i class="el-icon-chat-dot-square"></i>
              <span>评论管理</span>
            </template>
            <el-menu-item index="/pinglun" @click="saveNavState('/pinglun')">
              <template slot="title">
                <i class="el-icon-menu"></i>
                <span>评论列表</span>
              </template>
            </el-menu-item>
          </el-submenu>

          <!-- 公告管理 - 仅店主可见 -->
          <el-submenu index="9" v-if="hasPermission('gonggao')">
            <template slot="title">
              <i class="el-icon-document"></i>
              <span>公告管理</span>
            </template>
            <el-menu-item index="/gonggao" @click="saveNavState('/gonggao')">
              <template slot="title">
                <i class="el-icon-menu"></i>
                <span>公告列表</span>
              </template>
            </el-menu-item>
          </el-submenu>
        </el-menu>
      </el-aside>
      <!-- 右侧内容主体 -->
      <el-main>
        <router-view></router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script>
import { mapGetters } from "vuex";

export default {
  data() {
    return {
      menulist: [],
      iconsObj: {
        125: "iconfont icon-user",
        103: "iconfont icon-tijikongjian",
        101: "iconfont icon-shangpin",
        102: "iconfont icon-danju",
        145: "iconfont icon-baobiao",
      },
      isCollapse: false,
      activePath: "",
    };
  },
  computed: {
    ...mapGetters([
      "permission/userRole",
      "permission/userStoreId",
      "permission/hasPermission",
      "permission/isAdmin",
      "permission/isManager",
      "permission/isStaff",
    ]),
  },
  created() {
    this.activePath = window.sessionStorage.getItem("activePath") || "/";

    // 恢复权限状态
    this.$store.dispatch("permission/restorePermissionInfo");
  },
  methods: {
    hasPermission(permission) {
      return this.$store.getters["permission/hasPermission"](permission);
    },
    getUserName() {
      const staffInfo = JSON.parse(localStorage.getItem("staffInfo") || "{}");
      return staffInfo.name || "用户";
    },
    handleCommand(command) {
      if (command === "logout") {
        this.logout();
      } else if (command === "userInfo") {
        // 可以实现查看个人信息的功能
        this.$message.info("个人信息功能待实现");
      }
    },
    logout() {
      // 清除所有存储的数据
      window.sessionStorage.clear();
      localStorage.removeItem("token");
      localStorage.removeItem("staffInfo");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userStoreId");

      this.$message.success("退出登录成功");
      this.$router.push("/login");
    },
    toggleCollapse() {
      this.isCollapse = !this.isCollapse;
    },
    saveNavState(activePath) {
      window.sessionStorage.setItem("activePath", activePath);
      this.activePath = activePath;
    },
  },
};
</script>

<style lang="less" scoped>
.home-container {
  height: 100%;
}
.el-header {
  background-color: #373d41;
  display: flex;
  justify-content: space-between;
  padding-left: 0;
  align-items: center;
  color: #fff;
  font-size: 20px;
  height: 80px !important;
  > div {
    display: flex;
    align-items: center;
    span {
      margin-left: 15px;
    }
  }
  img {
    width: 60px;
    height: 60px;
    border-radius: 100%;
    margin: 15px 0px 15px 15px;
  }
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-right: 20px;
  color: #fff;
}

.el-dropdown-link {
  color: #fff;
  font-size: 16px;
}

.el-aside {
  background-color: #333744;
  .el-menu {
    border-right: none;
  }
}

.el-main {
  background-color: #eaedf1;
}

.iconfont {
  margin-right: 10px;
}

.toggle-button {
  background-color: #4a5064;
  font-size: 10px;
  line-height: 24px;
  color: #fff;
  text-align: center;
  letter-spacing: 0.2em;
  cursor: pointer;
}

.el-submenu [class^="el-icon-"] {
  vertical-align: -1px;
  margin-right: 8px;
}
</style>
