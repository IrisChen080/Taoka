<template>
  <div class="store-management">
    <!-- 面包屑导航 -->
    <el-breadcrumb separator-class="el-icon-arrow-right">
      <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
      <el-breadcrumb-item>门店管理</el-breadcrumb-item>
      <el-breadcrumb-item>门店列表</el-breadcrumb-item>
    </el-breadcrumb>

    <el-card class="box-card">
      <!-- 搜索栏与添加按钮 -->
      <div class="toolbar">
        <!-- 管理员可以选择门店查看 -->
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
          v-model="searchName"
          placeholder="搜索门店名称"
          clearable
          @clear="getStoreList"
          @keyup.enter.native="searchStore"
          style="width: 300px; margin-right: 20px"
        >
          <el-button slot="append" icon="el-icon-search" @click="searchStore" />
        </el-input>
        <el-button
          type="primary"
          icon="el-icon-plus"
          @click="showAddDialog"
          v-if="isAdmin"
        >
          添加门店
        </el-button>
      </div>

      <!-- 门店信息卡片 -->
      <el-card class="store-info" v-if="currentStore.store_id">
        <div class="info-header">
          <h2>{{ currentStore.store_name }}</h2>
          <el-tag :type="currentStore.status === '营业中' ? 'success' : 'danger'">
            {{ currentStore.status }}
          </el-tag>
        </div>

        <!-- 添加今日销售额显示 -->
        <div class="sales-summary">
          <div class="sales-card">
            <div class="sales-title">今日销售额</div>
            <div class="sales-amount">
              ¥{{ parseFloat(currentStore.daily_sales).toFixed(2) }}
            </div>
          </div>
          <div class="sales-card">
            <div class="sales-title">本月销售额</div>
            <div class="sales-amount">
              ¥{{ parseFloat(currentStore.monthly_sales).toFixed(2) }}
            </div>
          </div>
        </div>

        <!-- <div class="info-body">
          <div class="info-item">
            <span class="label">地址：</span>
            <span class="value">{{ currentStore.address }}</span>
          </div>
          <div class="info-item">
            <span class="label">电话：</span>
            <span class="value">{{ currentStore.phone }}</span>
          </div>
          <div class="info-item">
            <span class="label">营业时间：</span>
            <span class="value">{{ currentStore.opening_hours }}</span>
          </div>
        </div> -->

        <div class="action-buttons" v-if="isAdmin">
          <el-button
            size="mini"
            type="primary"
            icon="el-icon-edit"
            @click="showEditDialog(currentStore)"
          >
            编辑
          </el-button>
          <el-button
            size="mini"
            :type="currentStore.status === '营业中' ? 'warning' : 'success'"
            :icon="currentStore.status === '营业中' ? 'el-icon-close' : 'el-icon-check'"
            @click="changeStoreStatus(currentStore)"
          >
            {{ currentStore.status === "营业中" ? "歇业" : "营业" }}
          </el-button>
        </div>
      </el-card>

      <!-- 销售数据图表 -->
      <div class="chart-container" v-if="currentStore.store_id">
        <div id="dailyChart" style="width: 100%; height: 400px"></div>
        <div id="monthlyChart" style="width: 100%; height: 400px; margin-top: 20px"></div>
      </div>

      <!-- 门店表格 -->
      <el-table
        :data="storeList"
        border
        stripe
        v-loading="loading"
        v-if="isAdmin && !selectedStoreId"
      >
        <el-table-column type="index" label="#" width="60"></el-table-column>
        <el-table-column prop="store_name" label="门店名称"></el-table-column>
        <el-table-column prop="address" label="地址" min-width="180"></el-table-column>
        <el-table-column prop="phone" label="电话" width="140"></el-table-column>
        <el-table-column
          prop="opening_hours"
          label="营业时间"
          width="120"
        ></el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template v-slot="scope">
            <el-tag :type="scope.row.status === '营业中' ? 'success' : 'danger'">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template v-slot="scope">
            <div class="action-buttons-container">
              <el-button
                size="mini"
                type="primary"
                icon="el-icon-edit"
                @click="showEditDialog(scope.row)"
              >
                编辑
              </el-button>
              <el-button
                size="mini"
                :type="scope.row.status === '营业中' ? 'warning' : 'success'"
                :icon="scope.row.status === '营业中' ? 'el-icon-close' : 'el-icon-check'"
                @click="changeStoreStatus(scope.row)"
              >
                {{ scope.row.status === "营业中" ? "歇业" : "营业" }}
              </el-button>
              <el-button
                size="mini"
                type="info"
                icon="el-icon-view"
                @click="viewStoreDetail(scope.row)"
              >
                查看详情
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 添加门店对话框 -->
      <el-dialog
        title="添加门店"
        :visible.sync="addDialogVisible"
        width="50%"
        @close="addDialogClosed"
      >
        <el-form
          :model="addForm"
          :rules="storeFormRules"
          ref="addFormRef"
          label-width="100px"
        >
          <el-form-item label="门店名称" prop="store_name">
            <el-input v-model="addForm.store_name"></el-input>
          </el-form-item>
          <el-form-item label="地址" prop="address">
            <el-input v-model="addForm.address"></el-input>
          </el-form-item>
          <el-form-item label="电话" prop="phone">
            <el-input v-model="addForm.phone"></el-input>
          </el-form-item>
          <el-form-item label="营业时间" prop="opening_hours">
            <el-input
              v-model="addForm.opening_hours"
              placeholder="例如：9:00-22:00"
            ></el-input>
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="addForm.status" placeholder="请选择状态">
              <el-option label="营业中" value="营业中"></el-option>
              <el-option label="休息中" value="休息中"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="日销售额" prop="daily_sales">
            <el-input-number v-model="addForm.daily_sales" :min="0"></el-input-number>
          </el-form-item>
          <el-form-item label="月销售额" prop="monthly_sales">
            <el-input-number v-model="addForm.monthly_sales" :min="0"></el-input-number>
          </el-form-item>
        </el-form>
        <span slot="footer" class="dialog-footer">
          <el-button @click="addDialogVisible = false">取 消</el-button>
          <el-button type="primary" @click="addStore">确 定</el-button>
        </span>
      </el-dialog>

      <!-- 编辑门店对话框 -->
      <el-dialog
        title="编辑门店"
        :visible.sync="editDialogVisible"
        width="50%"
        @close="editDialogClosed"
      >
        <el-form
          :model="editForm"
          :rules="storeFormRules"
          ref="editFormRef"
          label-width="100px"
        >
          <el-form-item label="门店名称" prop="store_name">
            <el-input v-model="editForm.store_name"></el-input>
          </el-form-item>
          <el-form-item label="地址" prop="address">
            <el-input v-model="editForm.address"></el-input>
          </el-form-item>
          <el-form-item label="电话" prop="phone">
            <el-input v-model="editForm.phone"></el-input>
          </el-form-item>
          <el-form-item label="营业时间" prop="opening_hours">
            <el-input
              v-model="editForm.opening_hours"
              placeholder="例如：9:00-22:00"
            ></el-input>
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="editForm.status" placeholder="请选择状态">
              <el-option label="营业中" value="营业中"></el-option>
              <el-option label="休息中" value="休息中"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="日销售额" prop="daily_sales">
            <el-input-number v-model="editForm.daily_sales" :min="0"></el-input-number>
          </el-form-item>
          <el-form-item label="月销售额" prop="monthly_sales">
            <el-input-number v-model="editForm.monthly_sales" :min="0"></el-input-number>
          </el-form-item>
        </el-form>
        <span slot="footer" class="dialog-footer">
          <el-button @click="editDialogVisible = false">取 消</el-button>
          <el-button type="primary" @click="updateStore">确 定</el-button>
        </span>
      </el-dialog>
    </el-card>
  </div>
</template>

<script>
import * as echarts from "echarts";
import { mapGetters } from "vuex";

export default {
  data() {
    return {
      // 搜索关键词
      searchName: "",
      // 选中的门店ID
      selectedStoreId: 0,
      // 加载状态
      loading: false,
      // 门店列表
      storeList: [],
      // 当前选中的门店
      currentStore: {
        store_id: "",
        store_name: "",
        address: "",
        phone: "",
        opening_hours: "",
        status: "营业中",
        daily_sales: 0,
        monthly_sales: 0,
      },
      // 添加门店对话框
      addDialogVisible: false,
      // 添加门店表单
      addForm: {
        store_name: "",
        address: "",
        phone: "",
        opening_hours: "",
        status: "营业中",
        daily_sales: 0,
        monthly_sales: 0,
      },
      // 编辑门店对话框
      editDialogVisible: false,
      // 编辑门店表单
      editForm: {},
      // 表单验证规则
      storeFormRules: {
        store_name: [
          { required: true, message: "请输入门店名称", trigger: "blur" },
          { min: 2, max: 50, message: "长度在2到50个字符", trigger: "blur" },
        ],
        address: [{ required: true, message: "请输入门店地址", trigger: "blur" }],
        phone: [
          { required: true, message: "请输入联系电话", trigger: "blur" },
          {
            pattern: /^1[3-9]\d{9}$|^0\d{2,3}-\d{7,8}$/,
            message: "请输入有效的电话号码",
            trigger: "blur",
          },
        ],
        opening_hours: [{ required: true, message: "请输入营业时间", trigger: "blur" }],
        status: [{ required: true, message: "请选择门店状态", trigger: "change" }],
      },
      // 图表实例
      dailyChart: null,
      monthlyChart: null,
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
  },
  mounted() {
    window.addEventListener("resize", this.resizeCharts);
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.resizeCharts);
    this.disposeCharts();
  },
  methods: {
    // 获取门店列表
    async getStoreList() {
      this.loading = true;
      try {
        const { data: res } = await this.$http.get("/store/getStores");
        if (res.code === 200) {
          this.storeList = res.data;

          // 如果是管理员且没有选择门店，则只显示列表
          if (this.isAdmin && !this.selectedStoreId) {
            this.currentStore = {};
            this.disposeCharts();
          } else {
            // 如果已选择门店或非管理员（有固定门店），则加载门店数据
            const storeId = this.selectedStoreId || this.userStoreId;
            if (storeId) {
              this.fetchStoreData(storeId);
            }
          }
        } else {
          this.$message.error(res.msg || "获取门店列表失败");
        }
      } catch (error) {
        console.error("获取门店列表失败:", error);
        this.$message.error("获取门店列表失败");
      } finally {
        this.loading = false;
      }
    },

    // 搜索门店
    searchStore() {
      if (!this.searchName.trim()) {
        return this.getStoreList();
      }

      this.loading = true;
      // 前端过滤，实际项目中可以改为后端搜索API
      this.storeList = this.storeList.filter(
        (store) =>
          store.store_name.includes(this.searchName) ||
          store.address.includes(this.searchName)
      );
      this.loading = false;
    },

    // 处理门店切换
    async handleStoreChange() {
      if (this.selectedStoreId) {
        await this.fetchStoreData(this.selectedStoreId);
      } else {
        this.currentStore = {};
        this.disposeCharts();
      }
    },

    // 获取门店详细数据
    async fetchStoreData(storeId) {
      try {
        const { data: res } = await this.$http.get(`/store/getStore/${storeId}`);

        if (res.code === 200 && res.data) {
          this.currentStore = res.data;

          this.$nextTick(() => {
            this.initDailyChart();
            this.initMonthlyChart();
          });
        } else {
          this.$message.error(res.msg || "获取门店详情失败");
        }
      } catch (error) {
        console.error("获取门店详情失败:", error);
        this.$message.error("获取门店详情失败");
      }
    },

    // 查看门店详情
    viewStoreDetail(store) {
      this.selectedStoreId = store.store_id;
      this.fetchStoreData(store.store_id);
    },

    // 显示添加门店对话框
    showAddDialog() {
      this.addDialogVisible = true;
      // 重置表单
      this.addForm = {
        store_name: "",
        address: "",
        phone: "",
        opening_hours: "9:00-22:00",
        status: "营业中",
        daily_sales: 0,
        monthly_sales: 0,
      };
    },

    // 添加门店对话框关闭
    addDialogClosed() {
      this.$refs.addFormRef?.resetFields();
    },

    // 添加门店
    addStore() {
      this.$refs.addFormRef.validate(async (valid) => {
        if (!valid) return;

        try {
          const { data: res } = await this.$http.post("/store/addStore", this.addForm);

          if (res.code === 201) {
            this.$message.success("门店添加成功");
            this.addDialogVisible = false;
            this.getStoreList();
          } else {
            this.$message.error(res.msg || "添加失败");
          }
        } catch (error) {
          console.error("添加门店失败:", error);
          this.$message.error("添加失败");
        }
      });
    },

    // 显示编辑门店对话框
    showEditDialog(store) {
      this.editDialogVisible = true;
      this.editForm = JSON.parse(JSON.stringify(store)); // 深拷贝
    },

    // 编辑门店对话框关闭
    editDialogClosed() {
      this.$refs.editFormRef?.resetFields();
    },

    // 更新门店
    updateStore() {
      this.$refs.editFormRef.validate(async (valid) => {
        if (!valid) return;

        try {
          const { data: res } = await this.$http.post(
            "/store/updateStore",
            this.editForm
          );

          if (res.code === 200) {
            this.$message.success("门店更新成功");
            this.editDialogVisible = false;

            // 更新列表和当前选中的门店
            this.getStoreList();
            if (this.currentStore.store_id === this.editForm.store_id) {
              this.fetchStoreData(this.editForm.store_id);
            }
          } else {
            this.$message.error(res.msg || "更新失败");
          }
        } catch (error) {
          console.error("更新门店失败:", error);
          this.$message.error("更新失败");
        }
      });
    },

    // 切换门店营业状态
    async changeStoreStatus(store) {
      const newStatus = store.status === "营业中" ? "休息中" : "营业中";

      try {
        const { data: res } = await this.$http.post("/store/setStoreStatus", {
          store_id: store.store_id,
          status: newStatus,
        });

        if (res.code === 200) {
          this.$message.success(`门店已${newStatus}`);
          store.status = newStatus;

          // 如果是当前选中的门店，更新当前门店状态
          if (this.currentStore.store_id === store.store_id) {
            this.currentStore.status = newStatus;
          }
        } else {
          this.$message.error(res.msg || "状态更新失败");
        }
      } catch (error) {
        console.error("更新门店状态失败:", error);
        this.$message.error("状态更新失败");
      }
    },

    // 初始化日销售图表
    initDailyChart() {
      if (!document.getElementById("dailyChart")) return;

      // 清除旧图表
      if (this.dailyChart) {
        this.dailyChart.dispose();
      }

      this.dailyChart = echarts.init(document.getElementById("dailyChart"));

      // 获取过去7天的销售数据，使用真实的今日销售额
      const dailyData = this.generateDailyData();

      const option = {
        title: {
          text: "日销售额趋势 (最近7天)",
          left: "center",
        },
        tooltip: {
          trigger: "axis",
          formatter: "{b}: {c} 元",
        },
        xAxis: {
          type: "category",
          data: dailyData.map((item) => item.date),
        },
        yAxis: {
          type: "value",
          name: "金额（元）",
        },
        series: [
          {
            name: "日销售额",
            type: "line",
            data: dailyData.map((item) => item.sales),
            itemStyle: {
              color: "#409EFF",
            },
            markPoint: {
              data: [
                { type: "max", name: "最高" },
                { type: "min", name: "最低" },
              ],
            },
          },
        ],
      };

      this.dailyChart.setOption(option);
    },

    // 初始化月销售图表
    initMonthlyChart() {
      if (!document.getElementById("monthlyChart")) return;

      // 清除旧图表
      if (this.monthlyChart) {
        this.monthlyChart.dispose();
      }

      this.monthlyChart = echarts.init(document.getElementById("monthlyChart"));

      // 模拟过去6个月的销售数据，当月使用真实销售额
      const monthlyData = this.generateMonthlyData();

      const option = {
        title: {
          text: "月销售额趋势 (最近6个月)",
          left: "center",
        },
        tooltip: {
          trigger: "axis",
          formatter: "{b}: {c} 元",
        },
        xAxis: {
          type: "category",
          data: monthlyData.map((item) => item.month),
        },
        yAxis: {
          type: "value",
          name: "金额（元）",
        },
        series: [
          {
            name: "月销售额",
            type: "bar",
            data: monthlyData.map((item) => item.sales),
            itemStyle: {
              color: "#67C23A",
            },
            label: {
              show: true,
              position: "top",
              formatter: "{c} 元",
            },
          },
        ],
      };

      this.monthlyChart.setOption(option);
    },

    // 生成模拟的日销售数据（最近7天），当天使用真实的日销售额
    generateDailyData() {
      const data = [];
      const today = new Date();
      // 使用真实的日销售额数据
      const dailySales = parseFloat(this.currentStore.daily_sales) || 0;

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

        // 今天（i=0）使用真实销售额，过去几天使用随机模拟数据
        let sales;
        if (i === 0) {
          sales = dailySales;
        } else {
          // 根据当前销售额生成一些随机波动的历史数据
          const randomFactor = 0.7 + Math.random() * 0.6; // 在0.7到1.3之间随机波动
          sales = Math.round(dailySales * randomFactor);
        }

        data.push({
          date: dateStr,
          sales: sales,
        });
      }

      return data;
    },

    // 生成模拟的月销售数据（最近6个月），当月使用真实销售额
    generateMonthlyData() {
      const data = [];
      const today = new Date();
      const monthlySales = parseFloat(this.currentStore.monthly_sales) || 0;
      const months = [
        "一月",
        "二月",
        "三月",
        "四月",
        "五月",
        "六月",
        "七月",
        "八月",
        "九月",
        "十月",
        "十一月",
        "十二月",
      ];

      for (let i = 5; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(today.getMonth() - i);
        const monthIndex = date.getMonth();

        let sales;
        if (i === 0) {
          // 当月使用真实销售额
          sales = monthlySales;
        } else {
          // 历史月份使用模拟数据
          const randomFactor = 0.8 + Math.random() * 0.4; // 在0.8到1.2之间随机波动
          sales = Math.round(monthlySales * randomFactor);
        }

        data.push({
          month: months[monthIndex],
          sales: sales,
        });
      }

      return data;
    },

    // 图表响应式调整
    resizeCharts() {
      if (this.dailyChart) {
        this.dailyChart.resize();
      }
      if (this.monthlyChart) {
        this.monthlyChart.resize();
      }
    },

    // 释放图表实例
    disposeCharts() {
      if (this.dailyChart) {
        this.dailyChart.dispose();
        this.dailyChart = null;
      }
      if (this.monthlyChart) {
        this.monthlyChart.dispose();
        this.monthlyChart = null;
      }
    },
  },
};
</script>

<style scoped>
.store-management {
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

.store-info {
  margin-bottom: 20px;
}

.info-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.info-header h2 {
  margin-right: 20px;
  margin-bottom: 0;
}

.sales-summary {
  display: flex;
  justify-content: space-around;
  margin: 20px 0;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 8px;
}

.sales-card {
  text-align: center;
  padding: 10px 15px;
  border-radius: 6px;
  background-color: white;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  min-width: 150px;
}

.sales-title {
  font-size: 14px;
  color: #909399;
  margin-bottom: 5px;
}

.sales-amount {
  font-size: 22px;
  font-weight: bold;
  color: #409eff;
}

.info-body {
  padding: 0 20px;
}

.info-item {
  margin: 10px 0;
  font-size: 14px;
}

.label {
  color: #666;
  min-width: 80px;
  display: inline-block;
}

.value {
  color: #333;
}

.action-buttons {
  margin-top: 20px;
  text-align: right;
}

.chart-container {
  margin-top: 20px;
}

/* 操作按钮容器 */
.action-buttons-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: nowrap;
  width: 100%;
}

/* 设置所有操作按钮的宽度一致 */
.action-buttons-container .el-button {
  flex: 1;
  margin: 0 4px;
  padding: 7px 10px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.action-buttons-container .el-button:first-child {
  margin-left: 0;
}

.action-buttons-container .el-button:last-child {
  margin-right: 0;
}

/* 操作按钮中的图标与文字对齐 */
.action-buttons-container .el-button i {
  margin-right: 3px;
}

/* 响应式处理 */
@media screen and (max-width: 768px) {
  .action-buttons-container {
    flex-direction: column;
    gap: 5px;
  }

  .action-buttons-container .el-button {
    width: 100%;
    margin: 2px 0;
  }
}
/* 查看详情按钮悬停效果 */
.el-button--info:not(.is-disabled):hover {
  background-color: #909399;
  border-color: #909399;
  color: white;
}

/* 响应式调整 */
@media screen and (max-width: 768px) {
  .action-buttons {
    flex-wrap: wrap;
    justify-content: center;
  }

  .el-table-column--fixed-right {
    width: 100% !important;
  }

  .el-table-column--fixed-right .cell {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
