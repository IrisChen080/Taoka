<template>
  <div class="login_container">
    <div class="login_box">
      <div class="title">商家后台管理平台</div>
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginFormRules"
        label-width="0px"
        class="login_form"
      >
        <!-- 员工号 -->
        <el-form-item prop="staffId">
          <el-input
            v-model.number="loginForm.staffId"
            prefix-icon="el-icon-user"
            placeholder="请输入员工号"
          ></el-input>
        </el-form-item>
        <!-- 密码 -->
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            prefix-icon="el-icon-lock"
            type="password"
            placeholder="请输入密码"
          ></el-input>
        </el-form-item>
        <!-- 按钮区域 -->
        <el-form-item class="btns">
          <el-button type="primary" @click="login">登录</el-button>
          <el-button type="info" @click="resetLoginForm">重置</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      loginForm: {
        staffId: "", // 员工号字段
        password: "",
      },
      loginFormRules: {
        staffId: [
          { required: true, message: "请输入员工号", trigger: "blur" },
          { type: "number", message: "员工号必须为数字" },
        ],
        password: [
          { required: true, message: "请输入密码", trigger: "blur" },
          { min: 6, max: 20, message: "长度在6到20个字符", trigger: "blur" },
        ],
      },
    };
  },
  methods: {
    resetLoginForm() {
      this.$refs.loginFormRef.resetFields();
    },
    login() {
      this.$refs.loginFormRef.validate((valid) => {
        if (!valid) return;

        const staffId = Number(this.loginForm.staffId) || 0;
        if (!staffId) {
          this.$message.error("员工号必须为有效数字");
          return;
        }

        this.$http
          .post(
            "/staff/webLogin",
            {
              staffId: staffId,
              password: this.loginForm.password,
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          )
          .then((res) => {
            if (res.data.code === 200) {
              const userData = res.data.data;

              // 保存员工信息
              localStorage.setItem("staffInfo", JSON.stringify(userData));

              // 保存token (如果后端返回了token)
              if (userData.token) {
                localStorage.setItem("token", userData.token);
              }

              // 设置角色和门店ID到Vuex
              this.$store.commit("permission/SET_USER_ROLE", userData.role || "staff");
              this.$store.commit("permission/SET_USER_STORE_ID", userData.storeId);

              // 跳转到首页
              this.$router.push("/home");

              this.$message.success("登录成功！");
            } else {
              this.$message.error(res.data.msg || "登录失败");
            }
          })
          .catch((error) => {
            console.error("登录请求失败:", error);
            // 特别处理离职员工的错误信息
            if (
              error.response &&
              error.response.data &&
              error.response.data.code === 403
            ) {
              this.$message.error(
                error.response.data.msg || "该员工已离职，无法登录系统"
              );
            } else {
              this.$message.error("登录请求失败，请稍后再试");
            }
          });
      });
    },
  },
};
</script>

<style lang="less" scoped>
.login_container {
  width: 100%;
  height: 100%;
  /*如果想做背景图片 可以给标签一个class 直接添加背景图*/
  position: relative;
  background: url(../assets/bg.jpg);
  background-repeat: no-repeat;
  background-size: 100% 100%;
}
.login-bg {
  width: 100%;
  height: 100%;
  background: #3e3e3e;
}

.login_box {
  width: 400px;
  height: 270px;
  background: hsla(0, 0%, 100%, 0.3);
  border: 1px solid #f7f7f7;
  border-radius: 5px;
  border-radius: 3px;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  .title {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 60px;
    font-size: 24px;
    color: white;
    border-bottom: 1px solid #ffffff;
  }
  .avatar_box {
    height: 130px;
    width: 130px;
    border: 1px solid #eee;
    border-radius: 50%;
    padding: 10px;
    box-shadow: 0 0 10px #ddd;
    position: absolute;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: #fff;
    img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background-color: #eee;
    }
  }
}

.login_form {
  position: absolute;
  bottom: 0;
  width: 100%;
  padding: 0 20px;
  box-sizing: border-box;
}

.btns {
  display: flex;
  justify-content: flex-end;
}
</style>
