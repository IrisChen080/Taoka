<template>
  <div class="forbidden-container">
    <div class="forbidden-box">
      <h1>403</h1>
      <h2>无权限访问</h2>
      <p>抱歉，您没有访问该页面的权限。</p>
      <div class="btn-container">
        <el-button type="primary" @click="goBack">返回上一页</el-button>
        <el-button @click="goHome">返回首页</el-button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  methods: {
    goBack() {
      this.$router.go(-1);
    },
    goHome() {
      this.$router.push("/login");
    },
  },
};
</script>

<style scoped>
.forbidden-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
}

.forbidden-box {
  background-color: #fff;
  border-radius: 8px;
  padding: 40px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  max-width: 500px;
}

h1 {
  font-size: 72px;
  color: #f56c6c;
  margin-bottom: 10px;
}

h2 {
  font-size: 28px;
  margin-bottom: 20px;
}

p {
  margin-bottom: 30px;
  color: #606266;
}

.btn-container {
  display: flex;
  justify-content: center;
  gap: 20px;
}
</style>
