<template>
  <div class="order-management">
    <!-- 面包屑导航 -->
    <el-breadcrumb separator-class="el-icon-arrow-right">
      <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
      <el-breadcrumb-item>订单管理</el-breadcrumb-item>
      <el-breadcrumb-item>订单列表</el-breadcrumb-item>
    </el-breadcrumb>

    <el-card class="box-card">
      <!-- 搜索与筛选区域 -->
      <div class="toolbar">
        <!-- 管理员可以选择门店 -->
        <el-select
          v-if="isAdmin"
          v-model="selectedStoreId"
          placeholder="选择门店"
          @change="handleStoreChange"
          style="width: 150px; margin-right: 15px"
        >
          <el-option label="所有门店" :value="0"></el-option>
          <el-option
            v-for="store in storeList"
            :key="store.store_id"
            :label="store.store_name"
            :value="store.store_id"
          ></el-option>
        </el-select>

        <el-input
          v-model="searchPhone"
          placeholder="搜索用户电话"
          clearable
          @clear="loadOrders"
          @keyup.enter.native="searchOrder"
          style="width: 200px; margin-right: 15px"
        >
          <el-button slot="append" icon="el-icon-search" @click="searchOrder" />
        </el-input>

        <el-select
          v-model="filterStatus"
          placeholder="订单状态"
          @change="loadOrders"
          style="width: 120px; margin-right: 15px"
        >
          <el-option label="全部订单" value="all"></el-option>
          <el-option label="待出餐" value="0"></el-option>
          <el-option label="待确认" value="1"></el-option>
          <el-option label="已完成" value="2"></el-option>
        </el-select>

        <el-select
          v-model="filterType"
          placeholder="订单类型"
          @change="loadOrders"
          style="width: 120px; margin-right: 15px"
        >
          <el-option label="全部类型" value="all"></el-option>
          <el-option label="堂食" value="0"></el-option>
          <el-option label="外带" value="1"></el-option>
        </el-select>
      </div>

      <!-- 订单表格 -->
      <el-table
        :data="orderList"
        border
        v-loading="loading"
        :default-sort="{ prop: 'bianhao', order: 'descending' }"
      >
        <el-table-column type="index" label="#" width="50"></el-table-column>
        <el-table-column
          prop="bianhao"
          label="取餐号"
          sortable
          width="100"
        ></el-table-column>
        <el-table-column prop="tel" label="用户电话" width="130"></el-table-column>
        <el-table-column prop="title" label="商品名称" min-width="120"></el-table-column>
        <el-table-column prop="money" label="单价" width="80">
          <template slot-scope="scope">
            ¥{{ parseFloat(scope.row.money).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="shopNum" label="数量" width="70"></el-table-column>
        <el-table-column label="总价" width="90">
          <template slot-scope="scope">
            ¥{{ (parseFloat(scope.row.money) * parseInt(scope.row.shopNum)).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="订单类型" width="80">
          <template slot-scope="scope">
            <el-tag :type="scope.row.isTakeout === '1' ? 'warning' : 'success'">
              {{ scope.row.isTakeout === "1" ? "外带" : "堂食" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="订单状态" width="90">
          <template slot-scope="scope">
            <el-tag :type="getOrderStatusType(scope.row)">
              {{ getOrderStatusText(scope.row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="store_id" label="所属门店" width="100" v-if="isAdmin">
          <template slot-scope="scope">
            {{ getStoreName(scope.row.store_id) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template slot-scope="scope">
            <div class="action-buttons">
              <el-button
                size="mini"
                type="primary"
                :disabled="scope.row.is_chucan === '1'"
                @click="handleChucan(scope.row)"
                class="action-btn"
              >
                出餐
              </el-button>
              <el-button
                size="mini"
                type="success"
                :disabled="scope.row.is_chucan === '0' || scope.row.is_queren === '1'"
                @click="handleQueren(scope.row)"
                class="action-btn"
              >
                确认取餐
              </el-button>
              <el-button
                size="mini"
                type="danger"
                @click="handleDelete(scope.row)"
                class="action-btn"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页区域 -->
      <el-pagination
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        :current-page="queryParams.pagenum"
        :page-sizes="[10, 20, 50, 100]"
        :page-size="queryParams.pagesize"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        style="margin-top: 20px; text-align: right"
      >
      </el-pagination>
    </el-card>
  </div>
</template>

<script>
import { mapGetters } from "vuex";

export default {
  data() {
    return {
      // 选中的门店ID (0表示所有门店)
      selectedStoreId: 0,
      // 门店列表
      storeList: [],
      // 查询参数
      queryParams: {
        pagenum: 1,
        pagesize: 10,
      },
      // 搜索电话
      searchPhone: "",
      // 筛选订单状态
      filterStatus: "all",
      // 筛选订单类型
      filterType: "all",
      // 订单列表
      orderList: [],
      // 总记录数
      total: 0,
      // 加载状态
      loading: false,
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
    // 设置当前门店ID (非管理员)
    if (!this.isAdmin && this.userStoreId) {
      this.selectedStoreId = this.userStoreId;
    }

    // 获取门店列表
    this.getStoreList();

    // 加载订单列表
    this.loadOrders();
  },
  methods: {
    // 获取门店列表
    async getStoreList() {
      try {
        const { data: res } = await this.$http.get("/store/getStores");
        if (res.code === 200) {
          this.storeList = res.data;
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
      this.queryParams.pagenum = 1; // 切换门店时重置页码
      this.loadOrders();
    },

    // 加载订单列表
    async loadOrders() {
      this.loading = true;
      try {
        // 获取所有订单
        const { data: res } = await this.$http.get("/order/getDingdan");

        if (res.code === 200) {
          let filteredOrders = res.list;

          // 按门店ID筛选
          if (this.selectedStoreId > 0) {
            filteredOrders = filteredOrders.filter(
              (order) => parseInt(order.store_id) === this.selectedStoreId
            );
          }

          // 按状态筛选
          if (this.filterStatus !== "all") {
            if (this.filterStatus === "0") {
              // 待出餐
              filteredOrders = filteredOrders.filter((order) => order.is_chucan === "0");
            } else if (this.filterStatus === "1") {
              // 待确认
              filteredOrders = filteredOrders.filter(
                (order) => order.is_chucan === "1" && order.is_queren === "0"
              );
            } else if (this.filterStatus === "2") {
              // 已完成
              filteredOrders = filteredOrders.filter((order) => order.is_queren === "1");
            }
          }

          // 按订单类型筛选
          if (this.filterType !== "all") {
            filteredOrders = filteredOrders.filter(
              (order) => order.isTakeout === this.filterType
            );
          }

          // 按电话号码搜索
          if (this.searchPhone.trim() !== "") {
            filteredOrders = filteredOrders.filter((order) =>
              order.tel.includes(this.searchPhone)
            );
          }

          // 计算总数
          this.total = filteredOrders.length;

          // 分页处理
          const start = (this.queryParams.pagenum - 1) * this.queryParams.pagesize;
          const end = start + this.queryParams.pagesize;
          this.orderList = filteredOrders.slice(start, end);
        } else {
          this.$message.error("获取订单列表失败");
        }
      } catch (error) {
        console.error("获取订单列表失败:", error);
        this.$message.error("获取订单列表失败");
      } finally {
        this.loading = false;
      }
    },

    // 搜索订单
    searchOrder() {
      this.queryParams.pagenum = 1; // 搜索时重置页码
      this.loadOrders();
    },

    // 处理出餐
    async handleChucan(row) {
      try {
        const { data: res } = await this.$http.get("/order/updateChucan", {
          params: { dingdan_id: row.dingdan_id },
        });

        if (res.code === 200) {
          this.$message.success("已更新为出餐状态");
          row.is_chucan = "1"; // 更新本地状态
        } else {
          this.$message.error(res.msg || "操作失败");
        }
      } catch (error) {
        console.error("出餐操作失败:", error);
        this.$message.error("操作失败");
      }
    },

    // 处理确认送达
    async handleQueren(row) {
      try {
        const { data: res } = await this.$http.get("/order/updateQueren", {
          params: { dingdan_id: row.dingdan_id },
        });

        if (res.code === 200) {
          this.$message.success("已确认送达");
          row.is_queren = "1"; // 更新本地状态
        } else {
          this.$message.error(res.msg || "操作失败");
        }
      } catch (error) {
        console.error("确认送达操作失败:", error);
        this.$message.error("操作失败");
      }
    },

    // 处理删除订单
    handleDelete(row) {
      this.$confirm("此操作将永久删除该订单, 是否继续?", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(async () => {
          try {
            const { data: res } = await this.$http.get("/order/delOrder", {
              params: { dingdan_id: row.dingdan_id },
            });

            if (res.code === 200) {
              this.$message.success("删除成功");
              this.loadOrders(); // 重新加载列表
            } else {
              this.$message.error(res.msg || "删除失败");
            }
          } catch (error) {
            console.error("删除订单失败:", error);
            this.$message.error("删除失败");
          }
        })
        .catch(() => {
          this.$message.info("已取消删除");
        });
    },

    // 处理页面大小变化
    handleSizeChange(newSize) {
      this.queryParams.pagesize = newSize;
      this.loadOrders();
    },

    // 处理页码变化
    handleCurrentChange(newPage) {
      this.queryParams.pagenum = newPage;
      this.loadOrders();
    },

    // 获取订单状态文本
    getOrderStatusText(row) {
      if (row.is_chucan === "0") {
        return "待出餐";
      } else if (row.is_chucan === "1" && row.is_queren === "0") {
        return "待确认";
      } else if (row.is_queren === "1") {
        return "已完成";
      }
      return "未知状态";
    },

    // 获取订单状态标签类型
    getOrderStatusType(row) {
      if (row.is_chucan === "0") {
        return "warning"; // 待出餐
      } else if (row.is_chucan === "1" && row.is_queren === "0") {
        return "primary"; // 待确认
      } else if (row.is_queren === "1") {
        return "success"; // 已完成
      }
      return "info";
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
.order-management {
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
.action-buttons {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px; /* 按钮间距 */
}

.action-btn {
  flex: 1; /* 等宽分布 */
  min-width: 60px; /* 最小宽度保证文字不换行 */
  margin: 0 !important; /* 清除默认margin */
  padding: 7px 5px; /* 统一内边距 */
}

/* 保持按钮在不同状态下的对齐 */
.el-button--mini {
  line-height: 24px;
}
</style>
