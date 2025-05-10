<template>
  <div class="list">
    <!-- 面包屑导航区域 -->
    <el-breadcrumb separator-class="el-icon-arrow-right">
      <el-breadcrumb-item :to="{ path: '/home' }">首页</el-breadcrumb-item>
      <el-breadcrumb-item>公告管理</el-breadcrumb-item>
      <el-breadcrumb-item>列表</el-breadcrumb-item>
    </el-breadcrumb>

    <!-- 卡片视图区域 -->
    <el-card>
      <!-- 搜索与添加区域 -->
      <el-row :gutter="20">
        <el-col :span="8">
          <el-input
            placeholder="请输入内容"
            v-model="searchQuery"
            clearable
            @clear="getUserList()"
          >
            <el-button
              slot="append"
              icon="el-icon-search"
              @click="getUserSearch"
            ></el-button>
          </el-input>
        </el-col>
        <el-col :span="4">
          <!-- <el-button type="info" plain @click="quchong">一键去重</el-button> -->
        </el-col>
      </el-row>

      <!-- 用户列表区域 -->
      <el-table :data="userlist" border stripe>
        <el-table-column align="center" type="index"></el-table-column>
        <el-table-column
          align="center"
          label="公告信息"
          prop="msg"
        ></el-table-column>

        <el-table-column label="操作" width="150px">
          <template slot-scope="scope">
            <!-- 修改按钮 -->
            <el-button
              type="primary"
              icon="el-icon-edit"
              size="mini"
              @click="showEditDialog(scope.row)"
            ></el-button>

          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 修改 -->
    <el-dialog
      title="修改公告"
      :visible.sync="editDialogVisible"
      width="66%"
      @close="editDialogClosed"
    >
      <el-form :model="editForm" ref="editFormRef" label-width="90px">
        <el-form-item label="修改公告">
          <el-input v-model="editForm.msg"></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="editDialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="editUserInfo">确 定</el-button>
      </span>
    </el-dialog>
  </div>
</template>
<script>
export default {
  data() {
    return {
      userlist: [],
      searchQuery: "", // 搜索
      // 控制修改用户对话框的显示与隐藏
      editDialogVisible: false,
      editForm: [],
    };
  },
  created() {
    this.getUserList();
  },
  methods: {
    async getUserList() {
      const { data: res } = await this.$http.get("notice/getGonggao");
      // if (res.meat.status !== 200) return this.$message.error(res.meta.msg)
      this.userlist = res.list;
      console.log(res.list);
    },
    // 关闭修改对话框
    editDialogClosed() {
      this.$refs.editFormRef.resetFields();
    },
    // 修改
    showEditDialog(obj) {
      console.log(obj);
      this.editForm = obj;
      this.editDialogVisible = true;
    },

    // 确认修改
    async editUserInfo() {
      const { data: res } = await this.$http.get("updateGonggao", {
        params: {
          msg: this.editForm.msg,
        },
      });
      console.log(res);
      // 关闭对话框
      this.editDialogVisible = false;
      this.$message.success("修改成功！");
      this.getUserList();
    },

  },
};
</script>
<style lang="less" scoped>
.img {
  width: 120px;
  height: 80px;
}
.name_img{
    width: 30rpx;
    height: 30rpx;
    border-radius: 10000px;
}
</style>