<template>
  <div class="product-management">
    <el-breadcrumb separator-class="el-icon-arrow-right">
      <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
      <el-breadcrumb-item>商品管理</el-breadcrumb-item>
      <el-breadcrumb-item>商品列表</el-breadcrumb-item>
    </el-breadcrumb>

    <el-card class="box-card">
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
          placeholder="搜索商品名称或描述"
          clearable
          @clear="loadProducts"
          @keyup.enter.native="handleSearch"
          style="width: 300px; margin-right: 20px"
        >
          <el-button slot="append" icon="el-icon-search" @click="handleSearch" />
        </el-input>

        <!-- 管理员和非管理员都可以添加商品 -->
        <el-button type="primary" icon="el-icon-plus" @click="showAddDialog">
          新增商品
        </el-button>
      </div>

      <el-table :data="products" border v-loading="loading">
        <el-table-column align="center" type="index" label="序号" width="60" />
        <el-table-column prop="name" label="商品名称" min-width="150" />
        <el-table-column label="商品图片" width="120">
          <template v-slot="{ row }">
            <el-image
              v-if="row.image"
              :src="row.image"
              fit="cover"
              style="width: 80px; height: 60px"
              :preview-src-list="[row.image]"
            >
              <div slot="error" class="image-error">
                <i class="el-icon-picture-outline"></i>
              </div>
            </el-image>
            <span v-else>无图片</span>
          </template>
        </el-table-column>
        <el-table-column prop="price" label="价格" width="120">
          <template v-slot="{ row }">¥{{ parseFloat(row.price).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="80">
          <template v-slot="{ row }">{{ row.stock || 0 }}</template>
        </el-table-column>
        <el-table-column prop="description" label="商品描述" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="120">
          <template v-slot="{ row }">
            <el-tag :type="row.status === '上架' ? 'success' : 'info'">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <!-- 管理员可以看到所属门店 -->
        <el-table-column v-if="isAdmin" prop="store_name" label="所属门店" width="120" />
        <el-table-column label="操作" width="200" fixed="right">
          <template v-slot="{ row }">
            <!-- 编辑按钮 - 所有用户都可编辑 -->
            <el-button
              type="primary"
              icon="el-icon-edit"
              size="mini"
              @click="showEditDialog(row)"
            />
            <!-- 上下架按钮 - 非管理员或管理员操作自己门店的商品 -->
            <el-button
              :type="row.status === '上架' ? 'warning' : 'success'"
              :icon="row.status === '上架' ? 'el-icon-bottom' : 'el-icon-top'"
              size="mini"
              v-if="!isAdmin || row.store_id === userStoreId"
              @click="toggleStatus(row)"
            />
            <!-- 删除按钮 - 所有用户都可删除 -->
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
        :title="dialogType === 'add' ? '新增商品' : '编辑商品'"
        :visible.sync="dialogVisible"
        width="600px"
        @close="dialogClosed"
      >
        <el-form
          :model="currentProduct"
          ref="productForm"
          label-width="80px"
          label-position="left"
          :rules="rules"
        >
          <el-form-item label="商品名称" prop="name">
            <el-input v-model="currentProduct.name" />
          </el-form-item>
          <el-form-item label="价格" prop="price">
            <el-input-number
              v-model="currentProduct.price"
              :min="0"
              :precision="2"
              :step="1"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="库存" prop="stock">
            <el-input-number
              v-model="currentProduct.stock"
              :min="0"
              :step="1"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="商品描述" prop="description">
            <el-input v-model="currentProduct.description" type="textarea" :rows="3" />
          </el-form-item>

          <!-- 管理员可以选择门店 -->
          <el-form-item v-if="isAdmin" label="所属门店" prop="store_id">
            <el-select v-model="currentProduct.store_id" placeholder="请选择门店">
              <el-option
                v-for="store in storeList"
                :key="store.store_id"
                :label="store.store_name"
                :value="store.store_id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="图片上传" prop="image">
            <el-upload
              class="avatar-uploader"
              action="http://127.0.0.1:5000/upload"
              :show-file-list="false"
              :on-success="handleProductUploadSuccess"
              :before-upload="beforeProductUpload"
              accept="image/*"
            >
              <img
                v-if="currentProduct.image"
                :src="currentProduct.image"
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
            @click="dialogType === 'add' ? createProduct() : updateProduct()"
          >
            确 定
          </el-button>
        </div>
      </el-dialog>

      <!-- 删除确认对话框 -->
      <el-dialog title="确认删除" :visible.sync="deleteDialogVisible" width="400px">
        <div>确定要删除该商品吗？此操作不可恢复！</div>
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
      selectedStoreId: null, // 选中的门店ID
      storeList: [], // 门店列表
      searchKeyword: "",
      loading: false,
      products: [],
      dialogVisible: false,
      dialogType: "add",
      currentProduct: this.getDefaultProduct(),
      deleteDialogVisible: false, // 删除确认对话框
      productToDelete: null, // 待删除的商品
      rules: {
        name: [
          { required: true, message: "请输入商品名称", trigger: "blur" },
          { min: 2, max: 50, message: "长度在2到50个字符", trigger: "blur" },
        ],
        price: [
          { required: true, message: "请输入商品价格", trigger: "blur" },
          {
            validator: (rule, value, callback) => {
              if (value <= 0) callback(new Error("价格必须大于0"));
              else callback();
            },
            trigger: "blur",
          },
        ],
        stock: [{ required: true, message: "请输入库存数量", trigger: "blur" }],
        image: [{ required: true, message: "请上传商品图片", trigger: "change" }],
        description: [{ required: true, message: "请输入商品描述", trigger: "blur" }],
        store_id: [{ required: true, message: "请选择门店", trigger: "change" }],
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
    this.getStoreList();
  },
  methods: {
    getDefaultProduct() {
      return {
        id: null,
        name: "",
        price: 0,
        stock: 100,
        image: "",
        description: "",
        status: "上架", // 默认上架
        store_id: this.userStoreId || null,
      };
    },

    // 图片上传前的验证
    beforeProductUpload(file) {
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

    // 图片上传成功处理
    handleProductUploadSuccess(response, file) {
      if (response && response.code === 200 && response.imgUrl) {
        this.currentProduct.image = response.imgUrl;
        this.$message.success("图片上传成功");
      } else {
        this.$message.error("图片上传失败，请重试");
      }
    },

    // 对话框关闭处理
    dialogClosed() {
      if (this.$refs.productForm) {
        this.$refs.productForm.resetFields();
      }
    },

    // 获取门店列表
    async getStoreList() {
      try {
        const { data: res } = await this.$http.get("/store/getStores");
        if (res.code === 200) {
          this.storeList = res.data;

          // 设置默认门店
          if (this.isAdmin && this.storeList.length > 0) {
            // 管理员默认使用第一个门店
            this.selectedStoreId = this.storeList[0].store_id;
          } else {
            // 非管理员使用自己的门店
            this.selectedStoreId = this.userStoreId;
          }

          // 加载商品列表
          this.loadProducts();
        } else {
          this.$message.error("获取门店列表失败");
        }
      } catch (error) {
        console.error("获取门店列表失败:", error);
        this.$message.error("获取门店列表失败");
      }
    },

    // 处理门店切换
    handleStoreChange() {
      this.loadProducts();
    },

    // 加载商品数据
    async loadProducts() {
      if (!this.selectedStoreId) {
        return;
      }

      this.loading = true;
      try {
        const { data } = await this.$http.get("/product/getProducts", {
          params: { store_id: this.selectedStoreId },
        });

        if (data.code === 200) {
          this.products = data.data.map((item) => ({
            id: item.id || item.product_id,
            name: item.name,
            price: parseFloat(item.price),
            stock: item.stock || 0,
            image: item.image,
            description: item.description,
            status: item.status || "下架",
            store_id: this.selectedStoreId,
            store_name: this.getStoreName(this.selectedStoreId),
          }));
        } else {
          this.$message.error(data.msg || "商品加载失败");
        }
      } catch (error) {
        console.error("商品加载失败:", error);
        this.$message.error("商品加载失败");
      } finally {
        this.loading = false;
      }
    },

    // 处理搜索
    handleSearch() {
      if (!this.searchKeyword.trim()) {
        return this.loadProducts();
      }

      this.loading = true;

      const params = {
        keyword: this.searchKeyword,
        store_id: this.selectedStoreId,
      };

      this.$http
        .get("/product/search", { params })
        .then(({ data: res }) => {
          if (res.code === 200) {
            this.products = res.data.map((item) => ({
              ...item,
              store_id: this.selectedStoreId,
              store_name: this.getStoreName(this.selectedStoreId),
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

    showAddDialog() {
      this.dialogType = "add";
      this.currentProduct = this.getDefaultProduct();

      // 非管理员使用自己门店ID，管理员使用当前选中门店
      this.currentProduct.store_id = this.isAdmin
        ? this.selectedStoreId
        : this.userStoreId;

      this.dialogVisible = true;
      this.$nextTick(() => {
        this.$refs.productForm?.clearValidate();
      });
    },

    showEditDialog(product) {
      this.dialogType = "edit";
      this.currentProduct = { ...product };
      this.dialogVisible = true;
    },

    async createProduct() {
      try {
        await this.$refs.productForm.validate();

        // 非管理员确保使用自己门店的ID
        if (!this.isAdmin) {
          this.currentProduct.store_id = this.userStoreId;
        }

        // 判断库存，如果为0则自动下架
        const status = this.currentProduct.stock > 0 ? "上架" : "下架";

        const { data } = await this.$http.get("/product/add", {
          params: {
            name: this.currentProduct.name,
            price: this.currentProduct.price,
            image: this.currentProduct.image,
            description: this.currentProduct.description,
            store_id: this.currentProduct.store_id,
            stock: this.currentProduct.stock,
            status: status,
          },
        });

        if (data.code === 201) {
          this.$message.success("商品创建成功");
          this.dialogVisible = false;
          await this.loadProducts();
        } else {
          this.$message.error(data.msg || "创建失败");
        }
      } catch (error) {
        console.error("创建商品失败:", error);
        if (error.name !== "ValidateError") {
          this.$message.error(error.response?.data?.msg || "创建失败");
        }
      }
    },

    async updateProduct() {
      try {
        await this.$refs.productForm.validate();

        // 判断库存，如果为0则自动下架
        const status = this.currentProduct.stock > 0 ? "上架" : "下架";

        const { data } = await this.$http.get("/product/edit", {
          params: {
            id: this.currentProduct.id,
            name: this.currentProduct.name,
            price: this.currentProduct.price,
            image: this.currentProduct.image,
            description: this.currentProduct.description,
            stock: this.currentProduct.stock,
            status: status,
          },
        });

        if (data.code === 200) {
          this.$message.success("商品更新成功");
          this.dialogVisible = false;
          await this.loadProducts();
        } else {
          this.$message.error(data.msg || "更新失败");
        }
      } catch (error) {
        console.error("更新商品失败:", error);
        this.$message.error(error.response?.data?.msg || "更新失败");
      }
    },

    async toggleStatus(product) {
      // 非管理员和管理员只能操作自己门店的商品
      if (this.isAdmin && product.store_id !== this.userStoreId) {
        return this.$message.warning("您只能操作自己门店的商品");
      }

      const newStatus = product.status === "上架" ? "下架" : "上架";

      // 库存为0不能上架
      if (newStatus === "上架" && product.stock <= 0) {
        return this.$message.warning("库存为0，不能上架");
      }

      try {
        const { data } = await this.$http.get("/product/status", {
          params: {
            store_id: product.store_id,
            product_id: product.id,
            status: newStatus,
          },
        });

        if (data.code === 200) {
          this.$message.success("状态更新成功");
          product.status = newStatus;
        } else {
          this.$message.error(data.msg || "状态更新失败");
        }
      } catch (error) {
        console.error("更新状态失败:", error);
        this.$message.error(error.response?.data?.msg || "状态更新失败");
      }
    },

    // 处理删除
    handleDelete(product) {
      this.productToDelete = product;
      this.deleteDialogVisible = true;
    },

    // 确认删除
    async confirmDelete() {
      if (!this.productToDelete) return;

      try {
        const { data } = await this.$http.get("/product/delete", {
          params: {
            id: this.productToDelete.id,
          },
        });

        if (data.code === 200) {
          this.$message.success("商品删除成功");
          this.deleteDialogVisible = false;
          await this.loadProducts();
        } else {
          this.$message.error(data.msg || "删除失败");
        }
      } catch (error) {
        console.error("删除商品失败:", error);
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
.product-management {
  padding: 20px;
}

.box-card {
  margin-top: 20px;
}

.toolbar {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
}

.image-error {
  width: 80px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  color: #909399;
  font-size: 24px;
}

.dialog-footer {
  text-align: right;
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

.avatar {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
