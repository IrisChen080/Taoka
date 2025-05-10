<template>
  <div class="staff-management">
    <!-- 面包屑导航 -->
    <el-breadcrumb separator-class="el-icon-arrow-right">
      <el-breadcrumb-item :to="{ path: '/home' }">首页</el-breadcrumb-item>
      <el-breadcrumb-item>员工管理</el-breadcrumb-item>
      <el-breadcrumb-item>员工列表</el-breadcrumb-item>
    </el-breadcrumb>

    <!-- 卡片视图区域 -->
    <el-card style="margin-top: 20px">
      <!-- 搜索与添加区域 -->
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
          v-model="searchKeyword"
          placeholder="搜索员工名称或手机号"
          clearable
          @clear="getEmployeeList"
          @keyup.enter.native="handleSearch"
          style="width: 300px; margin-right: 15px"
        >
          <el-button slot="append" icon="el-icon-search" @click="handleSearch" />
        </el-input>

        <el-button type="primary" @click="openAddDialog">添加员工</el-button>
      </div>

      <!-- 员工列表区域 -->
      <el-table :data="filteredEmployeeList" border stripe v-loading="loading">
        <el-table-column type="index" align="center" width="60"></el-table-column>
        <el-table-column prop="staff_id" label="员工号" align="center" width="120">
          <template slot-scope="scope">
            <el-popover
              placement="top"
              width="280"
              trigger="hover"
              v-if="scope.row.idPattern"
            >
              <div class="id-pattern-popover">
                <div class="id-pattern-title">员工ID结构解析</div>
                <div class="id-pattern-content">
                  <div class="id-segment">
                    <span class="segment-value">{{ scope.row.idPattern.storeCode }}</span>
                    <span class="segment-label">门店代码</span>
                  </div>
                  <div class="id-segment">
                    <span class="segment-value">{{ scope.row.idPattern.roleCode }}</span>
                    <span class="segment-label">角色代码</span>
                  </div>
                  <div class="id-segment">
                    <span class="segment-value">{{ scope.row.idPattern.year }}</span>
                    <span class="segment-label">年份</span>
                  </div>
                  <div class="id-segment">
                    <span class="segment-value">{{ scope.row.idPattern.sequence }}</span>
                    <span class="segment-label">序号</span>
                  </div>
                </div>
              </div>
              <span slot="reference">{{ scope.row.staff_id }}</span>
            </el-popover>
            <span v-else @click="parseStaffId(scope.row)">{{ scope.row.staff_id }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="name"
          label="姓名"
          align="center"
          width="120"
        ></el-table-column>
        <el-table-column
          prop="phone"
          label="手机号"
          align="center"
          width="130"
        ></el-table-column>
        <el-table-column prop="role" label="角色" align="center" width="100">
          <template slot-scope="scope">
            <el-tag
              :type="
                scope.row.role === 'admin'
                  ? 'danger'
                  : scope.row.role === 'manager'
                  ? 'warning'
                  : 'info'
              "
            >
              {{ getRoleDisplayName(scope.row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="所属门店" align="center" width="150">
          <template slot-scope="scope">
            {{ getStoreName(scope.row.store_id) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" align="center" width="100">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '在职' ? 'success' : 'info'">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="gender" label="性别" align="center" width="80">
          <template slot-scope="scope">
            {{ scope.row.gender === "M" ? "男" : "女" }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template slot-scope="scope">
            <div class="action-buttons">
              <el-button
                type="primary"
                icon="el-icon-edit"
                size="mini"
                @click="openEditDialog(scope.row)"
                class="action-btn"
              >
                编辑
              </el-button>
              <el-button
                type="danger"
                icon="el-icon-delete"
                size="mini"
                @click="handleDelete(scope.row)"
                v-if="canDeleteEmployee(scope.row)"
                class="action-btn"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加员工对话框 -->
    <el-dialog
      title="添加员工"
      :visible.sync="addDialogVisible"
      width="50%"
      @close="resetDialogForm('addFormRef')"
    >
      <el-form
        :model="addForm"
        :rules="staffFormRules"
        ref="addFormRef"
        label-width="80px"
      >
        <el-form-item label="姓名" prop="name">
          <el-input v-model="addForm.name"></el-input>
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="addForm.phone"></el-input>
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select
            v-model="addForm.role"
            placeholder="请选择角色"
            @change="previewStaffId"
          >
            <!-- 移除了店主选项 -->
            <el-option label="主管" value="manager"></el-option>
            <el-option label="店员" value="staff"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="门店" prop="store_id">
          <el-select
            v-model="addForm.store_id"
            placeholder="请选择门店"
            @change="previewStaffId"
            :disabled="!isAdmin"
          >
            <el-option
              v-for="store in storeList"
              :key="store.store_id"
              :label="store.store_name"
              :value="store.store_id"
            ></el-option>
          </el-select>
          <div class="form-tip" v-if="!isAdmin">非管理员只能添加本门店员工</div>
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-select v-model="addForm.gender" placeholder="请选择性别">
            <el-option label="男" value="M"></el-option>
            <el-option label="女" value="F"></el-option>
          </el-select>
        </el-form-item>

        <!-- 员工ID预览区域 -->
        <el-form-item label="员工ID预览" v-if="staffIdPreview">
          <div class="staff-id-preview">
            <el-tag size="medium">{{ staffIdPreview }}</el-tag>
            <div class="id-preview-desc">系统将自动生成规律结构的员工ID</div>
          </div>

          <!-- ID结构说明 -->
          <div class="id-pattern" v-if="idPatternPreview">
            <div class="id-segment">
              <span class="segment-value">{{ idPatternPreview.storeCode }}</span>
              <span class="segment-label">门店代码</span>
            </div>
            <div class="id-segment">
              <span class="segment-value">{{ idPatternPreview.roleCode }}</span>
              <span class="segment-label">角色代码</span>
            </div>
            <div class="id-segment">
              <span class="segment-value">{{ idPatternPreview.year }}</span>
              <span class="segment-label">年份</span>
            </div>
            <div class="id-segment">
              <span class="segment-value">{{ idPatternPreview.sequence }}</span>
              <span class="segment-label">序号</span>
            </div>
          </div>
        </el-form-item>

        <!-- 移除了密码输入框 -->
        <div class="password-tip">默认密码为：123456</div>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAddEmployee">确定</el-button>
      </span>
    </el-dialog>

    <!-- 编辑员工对话框 -->
    <el-dialog
      title="编辑员工"
      :visible.sync="editDialogVisible"
      width="50%"
      @close="resetDialogForm('editFormRef')"
    >
      <el-form
        :model="editForm"
        :rules="staffFormRules"
        ref="editFormRef"
        label-width="80px"
      >
        <!-- 员工ID（不可修改） -->
        <el-form-item label="员工ID">
          <el-input v-model="editForm.staff_id" disabled></el-input>

          <!-- ID结构说明 -->
          <div class="id-pattern" v-if="editForm.idPattern">
            <div class="id-segment">
              <span class="segment-value">{{ editForm.idPattern.storeCode }}</span>
              <span class="segment-label">门店代码</span>
            </div>
            <div class="id-segment">
              <span class="segment-value">{{ editForm.idPattern.roleCode }}</span>
              <span class="segment-label">角色代码</span>
            </div>
            <div class="id-segment">
              <span class="segment-value">{{ editForm.idPattern.year }}</span>
              <span class="segment-label">年份</span>
            </div>
            <div class="id-segment">
              <span class="segment-value">{{ editForm.idPattern.sequence }}</span>
              <span class="segment-label">序号</span>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="姓名" prop="name">
          <el-input v-model="editForm.name"></el-input>
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="editForm.phone"></el-input>
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select
            v-model="editForm.role"
            placeholder="请选择角色"
            :disabled="editForm.role === 'admin'"
          >
            <!-- 编辑时也不能选择店主角色，但已是店主的仍显示店主 -->
            <el-option
              label="店主"
              value="admin"
              v-if="editForm.role === 'admin'"
            ></el-option>
            <el-option label="主管" value="manager"></el-option>
            <el-option label="店员" value="staff"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="门店" prop="store_id">
          <el-select
            v-model="editForm.store_id"
            placeholder="请选择门店"
            :disabled="!isAdmin"
          >
            <el-option
              v-for="store in storeList"
              :key="store.store_id"
              :label="store.store_name"
              :value="store.store_id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="editForm.status" placeholder="请选择状态">
            <el-option label="在职" value="在职"></el-option>
            <el-option label="离职" value="离职"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-select v-model="editForm.gender" placeholder="请选择性别">
            <el-option label="男" value="M"></el-option>
            <el-option label="女" value="F"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="editForm.password"
            type="password"
            placeholder="留空表示不修改"
          ></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmEditEmployee">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { mapGetters } from "vuex";

export default {
  data() {
    // 自定义验证规则
    const validatePhone = (rule, value, callback) => {
      const reg = /^1[3-9]\d{9}$/;
      if (!reg.test(value)) {
        return callback(new Error("请输入有效的手机号码"));
      }
      callback();
    };

    return {
      searchKeyword: "",
      loading: false,
      // 选中的门店ID (0表示所有门店)
      selectedStoreId: 0,
      // 门店列表
      storeList: [],
      // 员工列表
      employeeList: [],
      // 添加对话框
      addDialogVisible: false,
      // 添加表单 - 设置默认密码
      addForm: {
        name: "",
        phone: "",
        role: "staff", // 默认为店员
        store_id: "",
        gender: "M",
        password: "123456", // 默认密码
      },
      // 编辑对话框
      editDialogVisible: false,
      // 编辑表单
      editForm: {},
      // 表单验证规则 - 移除密码必填验证
      staffFormRules: {
        name: [
          { required: true, message: "请输入员工姓名", trigger: "blur" },
          { min: 2, max: 20, message: "长度在2到20个字符", trigger: "blur" },
        ],
        phone: [
          { required: true, message: "请输入手机号码", trigger: "blur" },
          { validator: validatePhone, trigger: "blur" },
        ],
        role: [{ required: true, message: "请选择角色", trigger: "change" }],
        store_id: [{ required: true, message: "请选择所属门店", trigger: "change" }],
        gender: [{ required: true, message: "请选择性别", trigger: "change" }],
        password: [
          {
            validator: (rule, value, callback) => {
              // 编辑时可以为空，非空时检查长度
              if (value && (value.length < 6 || value.length > 20)) {
                callback(new Error("密码长度在6到20个字符"));
              } else {
                callback();
              }
            },
            trigger: "blur",
          },
        ],
        status: [{ required: true, message: "请选择状态", trigger: "change" }],
      },
      // 新增：员工ID预览
      staffIdPreview: null,
      // 新增：ID结构预览
      idPatternPreview: null,
    };
  },
  computed: {
    ...mapGetters({
      userRole: "permission/userRole",
      userStoreId: "permission/userStoreId",
      isAdmin: "permission/isAdmin",
      isManager: "permission/isManager",
    }),
    // 对话框类型
    dialogType() {
      return this.addDialogVisible ? "add" : "edit";
    },
    // 根据搜索关键词和门店过滤后的员工列表
    filteredEmployeeList() {
      let result = [...this.employeeList];

      // 按关键词过滤
      if (this.searchKeyword) {
        const keyword = this.searchKeyword.toLowerCase();
        result = result.filter(
          (emp) => emp.name.toLowerCase().includes(keyword) || emp.phone.includes(keyword)
        );
      }

      // 按门店过滤
      if (this.selectedStoreId > 0) {
        result = result.filter((emp) => parseInt(emp.store_id) === this.selectedStoreId);
      }

      return result;
    },
  },
  created() {
    // 非管理员使用自己的门店ID
    if (!this.isAdmin && this.userStoreId) {
      this.selectedStoreId = this.userStoreId;
    }

    // 获取门店列表
    this.getStoreList();

    // 获取员工列表
    this.getEmployeeList();
  },
  methods: {
    // 获取门店列表
    async getStoreList() {
      try {
        const { data: res } = await this.$http.get("/store/getStores");
        if (res.code === 200) {
          this.storeList = res.data;

          // 设置添加表单的默认门店ID
          if (this.storeList.length > 0) {
            if (this.isAdmin) {
              // 管理员默认选择第一个门店
              this.addForm.store_id = this.storeList[0].store_id;
            } else {
              // 非管理员使用自己的门店
              this.addForm.store_id = this.userStoreId;
            }
          }

          // 初次加载后，尝试生成员工ID预览
          this.previewStaffId();
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
      // 无需重新获取员工列表，因为我们已经在计算属性中进行了过滤
    },

    // 获取员工列表
    async getEmployeeList() {
      this.loading = true;
      try {
        const { data: res } = await this.$http.get("staff/getStaff");
        if (res.code === 200) {
          this.employeeList = res.list;

          // 非管理员只能看到自己门店的员工
          if (!this.isAdmin && this.userStoreId) {
            this.employeeList = this.employeeList.filter(
              (emp) => parseInt(emp.store_id) === this.userStoreId
            );
          }

          // 对员工列表中的每个员工尝试解析ID结构
          this.employeeList.forEach((employee) => {
            this.parseStaffId(employee, false);
          });
        } else {
          this.$message.error(res.msg || "获取员工列表失败");
        }
      } catch (error) {
        console.error("获取员工列表失败:", error);
        this.$message.error("获取员工列表失败");
      } finally {
        this.loading = false;
      }
    },

    // 处理搜索
    handleSearch() {
      if (this.searchKeyword.trim()) {
        this.searchStaff();
      } else {
        this.getEmployeeList();
      }
    },

    // 搜索员工
    async searchStaff() {
      this.loading = true;
      try {
        const { data: res } = await this.$http.get("staff/searchStaff", {
          params: { keyword: this.searchKeyword },
        });

        if (res.code === 200) {
          this.employeeList = res.list;

          // 非管理员只能看到自己门店的员工
          if (!this.isAdmin && this.userStoreId) {
            this.employeeList = this.employeeList.filter(
              (emp) => parseInt(emp.store_id) === this.userStoreId
            );
          }

          // 对员工列表中的每个员工尝试解析ID结构
          this.employeeList.forEach((employee) => {
            this.parseStaffId(employee, false);
          });
        } else {
          this.$message.error(res.msg || "搜索失败");
        }
      } catch (error) {
        console.error("搜索员工失败:", error);
        this.$message.error("搜索失败");
      } finally {
        this.loading = false;
      }
    },

    // 打开添加对话框
    openAddDialog() {
      this.addDialogVisible = true;

      // 重置表单 - 保留默认密码
      this.$nextTick(() => {
        this.$refs.addFormRef?.resetFields();

        // 确保密码字段已设置为默认值
        this.addForm.password = "123456";

        // 设置默认门店ID - 非管理员只能添加自己门店的员工
        if (!this.isAdmin && this.userStoreId) {
          this.addForm.store_id = this.userStoreId;
        } else if (this.isAdmin && this.storeList.length > 0) {
          // 管理员可以选择，默认选第一个门店
          this.addForm.store_id = this.storeList[0].store_id;
        }

        // 尝试生成员工ID预览
        this.previewStaffId();
      });
    },

    // 生成员工ID预览
    async previewStaffId() {
      // 确保有必要的数据
      if (!this.addForm.store_id || !this.addForm.role) {
        this.staffIdPreview = null;
        this.idPatternPreview = null;
        return;
      }

      try {
        const { data: res } = await this.$http.get("staff/generateStaffId", {
          params: {
            store_id: this.addForm.store_id,
            role: this.addForm.role,
          },
        });

        if (res.code === 200 && res.data) {
          this.staffIdPreview = res.data.staff_id;
          this.idPatternPreview = res.data.idInfo;
        } else {
          this.staffIdPreview = null;
          this.idPatternPreview = null;
          console.error("生成员工ID预览失败:", res.msg);
        }
      } catch (error) {
        this.staffIdPreview = null;
        this.idPatternPreview = null;
        console.error("生成员工ID预览失败:", error);
      }
    },

    // 重置对话框表单
    resetDialogForm(formName) {
      this.$refs[formName]?.resetFields();

      // 重置预览
      if (formName === "addFormRef") {
        this.staffIdPreview = null;
        this.idPatternPreview = null;
      }
    },

    // 确认添加员工
    confirmAddEmployee() {
      this.$refs.addFormRef.validate(async (valid) => {
        if (!valid) return;

        try {
          // 强制非管理员只能添加自己门店的员工
          if (!this.isAdmin) {
            this.addForm.store_id = this.userStoreId;
          }

          // 确保添加的员工不是店主角色
          if (this.addForm.role === "admin") {
            this.addForm.role = "staff";
          }

          // 确保门店ID已设置
          if (!this.addForm.store_id) {
            this.$message.error("请选择门店");
            return;
          }

          const params = {
            ...this.addForm,
            store_id: parseInt(this.addForm.store_id),
            password: "123456", // 确保使用默认密码
          };

          const { data: res } = await this.$http.get("staff/addStaff", {
            params,
          });

          if (res.code === 200) {
            // 显示成功消息，包含生成的员工ID
            this.$message.success(`添加成功! 员工ID: ${res.data.staff_id}`);
            this.addDialogVisible = false;
            this.getEmployeeList();
          } else {
            this.$message.error(res.msg || "添加失败");
          }
        } catch (error) {
          console.error("添加员工失败:", error);
          this.$message.error("添加失败");
        }
      });
    },

    // 打开编辑对话框
    openEditDialog(row) {
      // 检查权限
      if (!this.canEditEmployee(row)) {
        this.$message.warning("您没有权限编辑该员工");
        return;
      }

      this.editForm = { ...row };

      // 确保ID为整数
      this.editForm.staff_id = parseInt(row.staff_id);
      this.editForm.store_id = parseInt(row.store_id);

      // 清除密码字段
      this.editForm.password = "";

      // 如果没有ID解析信息，尝试解析
      if (!this.editForm.idPattern) {
        this.parseStaffId(this.editForm, false);
      }

      this.editDialogVisible = true;
    },

    // 解析员工ID结构
    async parseStaffId(employee, showToast = true) {
      if (!employee || !employee.staff_id) return;

      try {
        // 如果员工ID太短，无法按新格式解析
        const staffIdStr = employee.staff_id.toString();
        if (staffIdStr.length < 6) {
          // 为旧员工ID格式设置占位解析
          employee.idPattern = {
            year: "旧ID",
            storeCode: "旧ID",
            sequence: "旧ID",
          };
          return;
        }

        // 解析ID结构：年份(2位) + 门店ID(2位) + 序号(2位)
        const year = staffIdStr.slice(0, 2);
        const storeCode = staffIdStr.slice(2, 4);
        const sequence = staffIdStr.slice(4, 6);

        employee.idPattern = {
          year,
          storeCode,
          sequence,
        };
      } catch (error) {
        console.error("解析员工ID失败:", error);
        if (showToast) {
          this.$message.error("解析员工ID失败");
        }
      }
    },

    // 确认编辑员工
    confirmEditEmployee() {
      this.$refs.editFormRef.validate(async (valid) => {
        if (!valid) return;

        try {
          // 非管理员只能编辑自己门店的员工
          if (!this.isAdmin) {
            this.editForm.store_id = this.userStoreId;
          }

          // 不能修改员工为店主角色，已是店主的保持不变
          if (!this.isAdmin && this.editForm.role === "admin") {
            this.editForm.role = "staff";
          }

          const params = {
            ...this.editForm,
            store_id: parseInt(this.editForm.store_id),
          };

          // 如果密码为空则删除该字段
          if (!params.password) {
            delete params.password;
          }

          const { data: res } = await this.$http.get("staff/updateStaff", {
            params,
          });

          if (res.code === 200) {
            this.$message.success("更新成功");
            this.editDialogVisible = false;
            this.getEmployeeList();
          } else {
            this.$message.error(res.msg || "更新失败");
          }
        } catch (error) {
          console.error("更新员工失败:", error);
          this.$message.error("更新失败");
        }
      });
    },

    // 删除员工
    handleDelete(row) {
      // 检查权限
      if (!this.canDeleteEmployee(row)) {
        this.$message.warning("您没有权限删除该员工");
        return;
      }

      this.$confirm("此操作将永久删除该员工, 是否继续?", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(async () => {
          try {
            const { data: res } = await this.$http.get("staff/deleteStaff", {
              params: { staff_id: row.staff_id },
            });

            if (res.code === 200) {
              this.$message.success("删除成功");
              this.getEmployeeList();
            } else {
              this.$message.error(res.msg || "删除失败");
            }
          } catch (error) {
            console.error("删除员工失败:", error);
            this.$message.error("删除失败");
          }
        })
        .catch(() => {
          this.$message.info("已取消删除");
        });
    },

    // 检查是否可以编辑员工
    canEditEmployee(employee) {
      // 店主可以编辑任何人
      if (this.isAdmin) return true;

      // 店长只能编辑自己门店的非店主员工
      if (this.isManager) {
        return (
          parseInt(employee.store_id) === this.userStoreId && employee.role !== "admin"
        );
      }

      // 店员不能编辑任何人
      return false;
    },

    // 检查是否可以删除员工
    canDeleteEmployee(employee) {
      // 店主可以删除任何人
      if (this.isAdmin) return true;

      // 店长只能删除自己门店的普通员工
      if (this.isManager) {
        return (
          parseInt(employee.store_id) === this.userStoreId && employee.role === "staff"
        );
      }

      // 店员不能删除任何人
      return false;
    },

    // 获取门店名称
    getStoreName(storeId) {
      const store = this.storeList.find((s) => s.store_id === parseInt(storeId));
      return store ? store.store_name : `门店${storeId}`;
    },

    // 获取角色显示名称
    getRoleDisplayName(role) {
      const roleMap = {
        admin: "店主",
        manager: "主管",
        staff: "店员",
      };
      return roleMap[role] || role;
    },
  },
};
</script>
<style scoped>
.staff-management {
  padding: 20px;
}

.toolbar {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
}

.password-tip {
  color: #909399;
  font-size: 14px;
  margin-left: 80px;
  margin-bottom: 15px;
}
.action-buttons {
  display: flex;
  align-items: center;
  justify-content: space-around; /* 两端对齐 */
  gap: 8px; /* 按钮间距 */
}

.action-btn {
  flex: 1; /* 等宽分布 */
  min-width: 60px; /* 防止文字换行 */
  margin: 0 !important; /* 清除默认margin */
  padding: 7px 5px; /* 统一内边距 */
  display: inline-flex; /* 保持图标对齐 */
  align-items: center;
  justify-content: center;
}

/* 调整图标与文字的间距 */
.el-button [class*="el-icon-"] + span {
  margin-left: 4px;
}

/* 保持按钮高度一致 */
.el-button--mini {
  line-height: 24px;
  height: 28px;
}
</style>
