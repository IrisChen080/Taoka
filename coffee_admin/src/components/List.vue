<template>
  <div class="coffee-management">
    <!-- 面包屑导航 -->
    <el-breadcrumb separator-class="el-icon-arrow-right">
      <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
      <el-breadcrumb-item>咖啡管理</el-breadcrumb-item>
      <el-breadcrumb-item>列表</el-breadcrumb-item>
    </el-breadcrumb>

    <el-card class="box-card">
      <!-- 搜索与新增按钮 -->
      <div class="toolbar">
        <!-- 管理员可以选择门店 -->
        <el-select
          v-if="isAdmin"
          v-model="selectedStoreId"
          placeholder="选择门店"
          @change="handleStoreChange"
          style="width: 150px; margin-right: 15px"
        >
          <el-option
            v-for="store in storeList"
            :key="store.store_id"
            :label="store.store_name"
            :value="store.store_id"
          ></el-option>
        </el-select>

        <el-input
          v-model="searchKeyword"
          placeholder="搜索咖啡名称或原料"
          clearable
          @clear="loadCoffee"
          @keyup.enter.native="handleSearch"
          style="width: 300px; margin-right: 20px"
        >
          <el-button slot="append" icon="el-icon-search" @click="handleSearch" />
        </el-input>
        <el-button type="primary" icon="el-icon-plus" @click="showAddDialog">
          新增咖啡
        </el-button>
      </div>

      <!-- 咖啡表格 -->
      <el-table :data="coffeeList" border v-loading="loading">
        <!-- 序号列 -->
        <el-table-column align="center" type="index" label="序号" width="60" />

        <!-- 分类 -->
        <el-table-column prop="fenlei_id" label="分类" width="100">
          <template #default="{ row }">
            <el-select
              v-model="row.fenlei_id"
              style="width: 80px"
              placeholder="分类"
              @focus="onFenleiFocus(row)"
              @change="changeFenlei(row)"
            >
              <el-option
                v-for="(item, index) in classList"
                :key="index"
                :label="item.text"
                :value="item.fenlei_id"
              />
            </el-select>
          </template>
        </el-table-column>

        <!-- 图片 -->
        <el-table-column label="图片" width="120">
          <template v-slot="{ row }">
            <el-image
              v-if="row.img"
              :src="row.img"
              fit="cover"
              style="width: 80px; height: 60px"
            >
              <div slot="error" class="image-error">
                <i class="el-icon-picture-outline"></i>
              </div>
            </el-image>
            <span v-else>无图片</span>
          </template>
        </el-table-column>

        <!-- 标题 -->
        <el-table-column prop="title" label="标题" min-width="120" />

        <!-- 原料 -->
        <el-table-column prop="ingredients" label="原料" min-width="120" />

        <!-- 口味 -->
        <el-table-column prop="taste" label="口味" min-width="100" show-overflow-tooltip>
          <template v-slot="{ row }">
            <div class="description-cell">{{ row.taste }}</div>
          </template>
        </el-table-column>
        <!-- 价格 -->
        <el-table-column prop="money" label="价格" width="100">
          <template v-slot="{ row }">¥{{ parseFloat(row.money).toFixed(2) }}</template>
        </el-table-column>

        <!-- 状态 -->
        <el-table-column prop="status" label="状态" width="100">
          <template v-slot="{ row }">
            <el-tag :type="row.status === '上架' ? 'success' : 'info'">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- 所属门店 - 仅管理员可见 -->
        <el-table-column v-if="isAdmin" prop="store_name" label="所属门店" width="120" />

        <!-- 操作 -->
        <el-table-column label="操作" width="200" fixed="right">
          <template v-slot="{ row }">
            <!-- 编辑 -->
            <el-button
              type="primary"
              icon="el-icon-edit"
              size="mini"
              @click="showEditDialog(row)"
            />
            <!-- 上下架 -->
            <el-button
              :type="row.status === '上架' ? 'warning' : 'success'"
              :icon="row.status === '上架' ? 'el-icon-bottom' : 'el-icon-top'"
              size="mini"
              v-if="!isAdmin || row.store_id === userStoreId"
              @click="toggleStatus(row)"
            />
            <!-- 删除 -->
            <el-button
              type="danger"
              icon="el-icon-delete"
              size="mini"
              @click="handleDelete(row)"
            />
          </template>
        </el-table-column>
      </el-table>

      <!-- 新增/编辑对话框 -->
      <el-dialog
        :title="dialogType === 'add' ? '新增咖啡' : '编辑咖啡'"
        :visible.sync="dialogVisible"
        width="600px"
        @close="dialogClosed"
      >
        <el-form
          :model="currentCoffee"
          ref="coffeeForm"
          label-width="80px"
          label-position="left"
          :rules="rules"
        >
          <el-form-item label="标题" prop="title">
            <el-input v-model="currentCoffee.title" />
          </el-form-item>
          <el-form-item label="分类" prop="fenlei_id">
            <el-select v-model="currentCoffee.fenlei_id" placeholder="请选择分类">
              <el-option
                v-for="(item, index) in classList"
                :key="index"
                :label="item.text"
                :value="item.fenlei_id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="原料" prop="ingredients">
            <el-input v-model="currentCoffee.ingredients" />
          </el-form-item>
          <el-form-item label="口味" prop="taste">
            <el-input v-model="currentCoffee.taste" />
          </el-form-item>
          <el-form-item label="价格" prop="money">
            <el-input-number
              v-model="currentCoffee.money"
              :min="0"
              :precision="2"
              :step="1"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>

          <!-- 管理员可以选择门店 -->
          <el-form-item v-if="isAdmin" label="所属门店" prop="store_id">
            <el-select v-model="currentCoffee.store_id" placeholder="请选择门店">
              <el-option
                v-for="store in storeList"
                :key="store.store_id"
                :label="store.store_name"
                :value="store.store_id"
              />
            </el-select>
          </el-form-item>

          <!-- 图片上传部分 -->
          <el-form-item label="图片上传" prop="img">
            <el-upload
              class="avatar-uploader"
              action="http://127.0.0.1:5000/upload"
              :show-file-list="false"
              :on-success="handleCoffeeUploadSuccess"
              :before-upload="beforeCoffeeUpload"
              accept="image/*"
            >
              <img
                v-if="currentCoffee.img"
                :src="currentCoffee.img"
                class="avatar"
                style="width: 80px; height: 60px"
              />
              <i
                v-else
                class="el-icon-plus avatar-uploader-icon"
                style="font-size: 28px; color: #8c939d"
              ></i>
            </el-upload>
          </el-form-item>
        </el-form>

        <div slot="footer" class="dialog-footer">
          <el-button @click="dialogVisible = false">取 消</el-button>
          <el-button
            type="primary"
            @click="dialogType === 'add' ? createCoffee() : updateCoffee()"
            >确 定</el-button
          >
        </div>
      </el-dialog>

      <!-- 删除确认对话框 -->
      <el-dialog title="确认删除" :visible.sync="deleteDialogVisible" width="400px">
        <div>确定要删除该菜单吗？此操作不可恢复！</div>
        <div slot="footer" class="dialog-footer">
          <el-button @click="deleteDialogVisible = false">取 消</el-button>
          <el-button type="danger" @click="confirmDelete">确 定</el-button>
        </div>
      </el-dialog>
    </el-card>
  </div>
</template>

<script>
import { mapGetters } from "vuex";

export default {
  data() {
    return {
      // 搜索关键词
      searchKeyword: "",
      loading: false,
      // 咖啡数据列表
      coffeeList: [],
      // 分类数据
      classList: [],
      // 门店列表
      storeList: [],
      // 选中的门店ID
      selectedStoreId: null,
      // 控制新增/编辑对话框
      dialogVisible: false,
      dialogType: "add",
      // 当前操作的咖啡对象
      currentCoffee: this.getDefaultCoffee(),
      // 删除确认对话框
      deleteDialogVisible: false,
      coffeeToDelete: null,
      // 校验规则
      rules: {
        title: [
          { required: true, message: "请输入咖啡标题", trigger: "blur" },
          { min: 2, max: 50, message: "长度在2到50个字符", trigger: "blur" },
        ],
        fenlei_id: [{ required: true, message: "请选择分类", trigger: "change" }],
        ingredients: [{ required: true, message: "请输入原料", trigger: "blur" }],
        taste: [{ required: true, message: "请输入口味", trigger: "blur" }],
        money: [{ required: true, message: "请输入价格", trigger: "blur" }],
        store_id: [{ required: true, message: "请选择门店", trigger: "change" }],
        img: [{ required: true, message: "请上传图片", trigger: "change" }],
      },
    };
  },
  computed: {
    ...mapGetters({
      userRole: "permission/userRole",
      userStoreId: "permission/userStoreId",
      isAdmin: "permission/isAdmin",
    }),
  },
  created() {
    // 获取门店列表
    this.getStores();

    // 获取分类列表
    this.getClassList();
  },
  methods: {
    // 默认咖啡对象
    getDefaultCoffee() {
      return {
        goods_id: null,
        title: "",
        fenlei_id: "",
        ingredients: "",
        taste: "",
        money: 0,
        img: "",
        status: "上架", // 默认上架
        store_id: this.userStoreId || null,
      };
    },
    beforeCoffeeUpload(file) {
      const isImage = file.type.startsWith("image/");
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isImage) {
        this.$message.error("上传图片只能是图片格式");
      }
      if (!isLt2M) {
        this.$message.error("上传图片大小不能超过 2MB");
      }
      return isImage && isLt2M;
    },
    handleCoffeeUploadSuccess(response, file) {
      if (response && response.code === 200 && response.imgUrl) {
        this.currentCoffee.img = response.imgUrl;
        this.$message.success("图片上传成功");
      } else {
        this.$message.error("图片上传失败，请重试");
      }
    },
    // 获取门店列表
    async getStores() {
      try {
        const { data: res } = await this.$http.get("/store/getStores");
        if (res.code === 200) {
          this.storeList = res.data;

          // 管理员默认选择第一个门店
          if (this.isAdmin && this.storeList.length > 0) {
            this.selectedStoreId = this.storeList[0].store_id;
          } else {
            // 非管理员使用自己的门店
            this.selectedStoreId = this.userStoreId;
          }

          // 加载咖啡列表
          this.loadCoffee();
        } else {
          this.$message.error("获取门店列表失败");
        }
      } catch (error) {
        console.error("获取门店列表失败:", error);
        this.$message.error("获取门店列表失败");
      }
    },
    // 获取分类列表
    async getClassList() {
      try {
        const { data: res } = await this.$http.get("/category/getClassTabs");
        if (res.code === 200) {
          this.classList = res.list;
        } else {
          this.$message.error("获取分类列表失败");
        }
      } catch (error) {
        console.error("获取分类列表失败:", error);
        this.$message.error("获取分类列表失败");
      }
    },
    // 获取咖啡列表
    async loadCoffee() {
      if (!this.selectedStoreId) {
        return;
      }

      this.loading = true;
      try {
        let url = "/goods/getData";
        let params = {
          store_id: this.selectedStoreId,
        };

        const { data: res } = await this.$http.get(url, { params });
        if (res.code === 200) {
          this.coffeeList = res.list.map((item) => ({
            ...item,
            store_name: this.getStoreName(this.selectedStoreId),
            store_id: this.selectedStoreId,
          }));
        } else {
          this.$message.error("加载失败: " + res.msg);
        }
      } catch (error) {
        console.error("加载咖啡列表失败:", error);
        this.$message.error("加载失败");
      } finally {
        this.loading = false;
      }
    },
    // 处理门店切换
    handleStoreChange() {
      this.loadCoffee();
    },
    // 搜索
    handleSearch() {
      if (!this.searchKeyword.trim()) {
        return this.loadCoffee();
      }
      this.loading = true;

      let params = {
        keyword: this.searchKeyword,
        store_id: this.selectedStoreId,
      };

      this.$http
        .get("/goods/search", { params })
        .then(({ data: res }) => {
          if (res.code === 200) {
            this.coffeeList = res.list.map((item) => ({
              ...item,
              store_name: this.getStoreName(this.selectedStoreId),
              store_id: this.selectedStoreId,
            }));
          } else {
            this.$message.error("搜索失败: " + res.msg);
          }
        })
        .catch((error) => {
          console.error("搜索失败:", error);
          this.$message.error("搜索失败");
        })
        .finally(() => (this.loading = false));
    },
    // 显示新增对话框
    showAddDialog() {
      this.dialogType = "add";
      this.currentCoffee = this.getDefaultCoffee();

      // 非管理员使用自己门店ID，管理员使用当前选中门店
      this.currentCoffee.store_id = this.isAdmin
        ? this.selectedStoreId
        : this.userStoreId;

      this.dialogVisible = true;
      this.$nextTick(() => {
        this.$refs.coffeeForm?.clearValidate();
      });
    },
    // 显示编辑对话框
    showEditDialog(coffee) {
      this.dialogType = "edit";
      this.currentCoffee = { ...coffee };
      this.dialogVisible = true;
    },
    // 对话框关闭
    dialogClosed() {
      if (this.$refs.coffeeForm) {
        this.$refs.coffeeForm.resetFields();
      }
    },
    // 新增咖啡
    async createCoffee() {
      try {
        await this.$refs.coffeeForm.validate();

        // 非管理员确保使用自己门店的ID
        if (!this.isAdmin) {
          this.currentCoffee.store_id = this.userStoreId;
        }

        const response = await this.$http.get("/goods/addData", {
          params: this.currentCoffee,
        });

        if (response.data.code === 200) {
          this.$message.success("创建成功");
          this.dialogVisible = false;
          this.loadCoffee();
        } else {
          this.$message.error(response.data.msg || "创建失败");
        }
      } catch (error) {
        console.error("创建咖啡失败:", error);
        if (error.name !== "ValidateError") {
          this.$message.error("创建失败");
        }
      }
    },
    // 编辑咖啡
    async updateCoffee() {
      try {
        await this.$refs.coffeeForm.validate();

        const response = await this.$http.get("/goods/updateData", {
          params: this.currentCoffee,
        });

        if (response.data.code === 200) {
          this.$message.success("更新成功");
          this.dialogVisible = false;
          this.loadCoffee();
        } else {
          this.$message.error(response.data.msg || "更新失败");
        }
      } catch (error) {
        console.error("更新咖啡失败:", error);
        this.$message.error("更新失败");
      }
    },
    // 上下架切换
    async toggleStatus(coffee) {
      // 仅非管理员和管理员操作自己门店的商品可以切换状态
      if (this.isAdmin && coffee.store_id !== this.userStoreId) {
        return this.$message.warning("您只能操作自己门店的商品");
      }

      const newStatus = coffee.status === "上架" ? "下架" : "上架";

      try {
        const response = await this.$http.get("/goods/status", {
          params: {
            store_id: coffee.store_id || this.selectedStoreId,
            goods_id: coffee.goods_id,
            status: newStatus,
          },
        });

        if (response.data.code === 200) {
          this.$message.success("状态更新成功");
          coffee.status = newStatus;
        } else {
          this.$message.error(response.data.msg || "状态更新失败");
        }
      } catch (error) {
        console.error("更新状态失败:", error);
        this.$message.error("状态更新失败");
      }
    },
    // 分类选择框获取焦点时触发
    onFenleiFocus(row) {
      // 将要编辑的行数据存起来，以便下拉框修改后触发change事件更新
      this.currentCoffee = row;
    },
    // 修改商品分类
    async changeFenlei(row) {
      try {
        const { data: res } = await this.$http.get("/goods/updateData", {
          params: row,
        });

        if (res.code === 200) {
          this.$message.success("分类修改成功");
          this.loadCoffee();
        } else {
          this.$message.error(res.msg || "分类修改失败");
        }
      } catch (error) {
        console.error("修改分类失败:", error);
        this.$message.error("分类修改失败");
      }
    },

    // 处理删除
    handleDelete(coffee) {
      this.coffeeToDelete = coffee;
      this.deleteDialogVisible = true;
    },

    // 确认删除
    async confirmDelete() {
      if (!this.coffeeToDelete) return;

      try {
        const { data } = await this.$http.get("/goods/delete", {
          params: {
            goods_id: this.coffeeToDelete.goods_id,
          },
        });

        if (data.code === 200) {
          this.$message.success("菜单删除成功");
          this.deleteDialogVisible = false;
          await this.loadCoffee();
        } else {
          this.$message.error(data.msg || "删除失败");
        }
      } catch (error) {
        console.error("删除菜单失败:", error);
        this.$message.error("删除失败");
      }
    },

    // 获取门店名称
    getStoreName(storeId) {
      const store = this.storeList.find((s) => s.store_id === parseInt(storeId));
      return store ? store.store_name : `门店${storeId}`;
    },
  },
};
</script>

<style scoped>
.coffee-management {
  padding: 20px;
}

.toolbar {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
}

.box-card {
  margin-top: 20px;
}

.image-error {
  width: 80px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  color: #909399;
}

.avatar-uploader {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  width: 80px;
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.avatar-uploader:hover {
  border-color: #409eff;
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  line-height: 60px;
  text-align: center;
}
.description-cell {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.5;
  max-height: 3em;
}
</style>
