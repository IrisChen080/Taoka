<template>
  <div class="member-management">
    <el-row>
      <!-- 搜索框 -->
      <el-col :span="8">
        <el-input
          placeholder="请输入内容"
          v-model="searchKeyword"
          clearable
          @clear="getUserList"
        >
          <el-button
            slot="append"
            icon="el-icon-search"
            @click="handleSearch"
          ></el-button>
        </el-input>
      </el-col>
    </el-row>

    <!-- 会员列表 -->
    <el-table :data="members" style="width: 100%" v-loading="loading">
      <el-table-column align="center" type="index"></el-table-column>
      <el-table-column label="昵称" prop="nickname" width="120" />
      <el-table-column label="手机号" prop="tel" width="120" />
      <el-table-column label="会员等级" width="100">
        <template slot-scope="scope">
          <span :class="['level-tag', 'level-' + scope.row.level]">
            {{ scope.row.level }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="会员统计" width="180">
        <template slot-scope="scope">
          <div v-if="scope.row.orderStats">
            <div>订单数: {{ scope.row.orderStats.orderCount }}</div>
            <div>消费额: {{ scope.row.orderStats.totalSpent }}元</div>
            <el-progress
              :percentage="scope.row.orderStats.progress"
              :status="scope.row.orderStats.progress >= 100 ? 'success' : ''"
            ></el-progress>
            <div v-if="scope.row.orderStats.ordersNeeded > 0">
              距离{{ scope.row.orderStats.nextLevel }}还需{{
                scope.row.orderStats.ordersNeeded
              }}单
            </div>
            <div v-else>已达最高等级</div>
          </div>
          <div v-else>
            <el-button size="mini" type="text" @click="loadUserStats(scope.row)"
              >加载统计</el-button
            >
          </div>
        </template>
      </el-table-column>
      <el-table-column label="会员特权" width="180">
        <template slot-scope="scope">
          <div v-if="scope.row.orderStats && scope.row.orderStats.privileges">
            <ul class="privilege-list">
              <li
                v-for="(privilege, index) in scope.row.orderStats.privileges"
                :key="index"
              >
                {{ privilege }}
              </li>
            </ul>
          </div>
          <div v-else>-</div>
        </template>
      </el-table-column>
      <el-table-column label="性别" prop="xingbie" width="80" />
      <el-table-column label="生日" prop="birthday" width="120" :formatter="formatDate" />
      <el-table-column label="操作" width="180">
        <template slot-scope="scope">
          <el-button @click="openEditDialog(scope.row)" size="small" type="warning"
            >编辑</el-button
          >
          <el-button
            @click="upgradeLevel(scope.row)"
            size="small"
            type="primary"
            :disabled="scope.row.level === '钻石'"
          >
            升级
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 编辑会员弹窗 -->
    <el-dialog :visible.sync="editDialogVisible" title="编辑会员信息">
      <el-form :model="selectedMember" label-width="100px">
        <el-form-item label="昵称">
          <el-input v-model="selectedMember.nickname" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="selectedMember.tel" />
        </el-form-item>
        <el-form-item label="生日">
          <el-date-picker
            v-model="selectedMember.birthday"
            type="date"
            placeholder="选择生日"
            value-format="yyyy-MM-dd"
          />
        </el-form-item>
        <el-form-item label="会员等级">
          <el-select v-model="selectedMember.level" placeholder="请选择会员等级">
            <el-option label="普通" value="普通" />
            <el-option label="黄金" value="黄金" />
            <el-option label="钻石" value="钻石" />
          </el-select>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="editDialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="saveMember">确 定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import axios from "axios";
import { Loading, Message } from "element-ui";

export default {
  data() {
    return {
      searchKeyword: "", // 新增搜索变量
      members: [],
      loading: false,
      selectedMember: {},
      editDialogVisible: false,
    };
  },
  methods: {
    // 日期格式化方法
    formatDate(row, column, cellValue) {
      if (!cellValue) return "-"; // 空值显示为短横线
      return cellValue.split("T")[0].replace(/\s.*/, "");
    },
    // 修改获取所有会员信息的方法
    fetchMembers() {
      this.loading = true;

      // 记录请求开始时间，用于调试
      console.log("开始加载会员数据:", new Date().toISOString());

      axios
        .get("/user/getUser") // 确保路径正确
        .then((response) => {
          console.log("会员数据加载成功:", response.data);

          if (response.data.code === 200) {
            this.members = response.data.list.map((member) => ({
              ...member,
              orderStats: null,
            }));
            this.loading = false; // 成功后关闭加载状态
          } else {
            console.error("获取会员列表返回错误:", response.data.msg);
            Message.error(response.data.msg || "加载会员信息失败");
            this.loading = false; // 错误时也要关闭加载状态
          }
        })
        .catch((error) => {
          console.error("加载会员信息失败:", error);
          Message.error("加载会员信息失败");
          this.loading = false; // 确保出错时也关闭加载状态
        })
        .finally(() => {
          // 无论成功还是失败，都确保关闭加载状态
          this.loading = false;
          console.log("会员数据加载完成:", new Date().toISOString());
        });
    },
    // 加载用户订单统计信息
    async loadUserStats(member) {
      try {
        const { data: res } = await axios.get("user/getUserOrderStats", {
          params: { tel: member.tel },
        });

        if (res.code === 200) {
          // 更新会员信息中的订单统计
          const index = this.members.findIndex((m) => m.user_id === member.user_id);
          if (index !== -1) {
            this.$set(this.members[index], "orderStats", res.data);
          }
        } else {
          Message.error(res.msg || "加载会员统计失败");
        }
      } catch (error) {
        console.error("加载会员统计失败:", error);
        Message.error("加载会员统计失败");
      }
    },
    // 清空搜索后重新加载数据
    getUserList() {
      this.fetchMembers();
    },
    // 搜索会员
    async handleSearch() {
      if (!this.searchKeyword) {
        this.fetchMembers();
        return;
      }
      try {
        const { data: res } = await axios.get("user/searchMember", {
          params: {
            nickname: this.searchKeyword,
            tel: this.searchKeyword,
            level: this.searchKeyword, // 同时搜索会员等级
          },
        });
        this.members = res.list.map((member) => ({
          ...member,
          orderStats: null,
        }));
      } catch (error) {
        Message.error("搜索失败");
      }
    },
    // 手动升级会员
    async upgradeLevel(member) {
      try {
        let newLevel = "黄金";
        if (member.level === "黄金") {
          newLevel = "钻石";
        } else if (member.level === "钻石") {
          return; // 已是最高等级
        }

        const { data: res } = await axios.put("user/updateUserLevel", {
          user_id: member.user_id,
          level: newLevel,
        });

        if (res.code === 200) {
          member.level = newLevel;
          Message.success(`会员已升级为${newLevel}会员`);

          // 更新会员特权信息
          if (member.orderStats) {
            const memberPrivileges = {
              普通: ["正常价格"],
              黄金: ["会员价格", "9折优惠", "优先出餐"],
              钻石: ["会员价格", "8折优惠", "优先出餐", "每月免费咖啡一杯"],
            };
            member.orderStats.privileges = memberPrivileges[newLevel] || [];
            member.orderStats.currentLevel = newLevel;
          }
        } else {
          Message.error(res.msg || "升级失败");
        }
      } catch (error) {
        console.error("升级会员失败:", error);
        Message.error("升级失败");
      }
    },
    // 打开编辑弹窗
    openEditDialog(member) {
      this.selectedMember = member
        ? { ...member }
        : { user_id: "", nickname: "", tel: "", birthday: "", level: "普通" };
      this.editDialogVisible = true;
    },
    // 保存编辑后的会员信息
    saveMember() {
      if (!this.selectedMember.nickname || !this.selectedMember.tel) {
        Message.warning("昵称和手机号是必填项");
        return;
      }

      // 处理日期格式
      let birthday = this.selectedMember.birthday;
      if (birthday && birthday.includes("T")) {
        birthday = birthday.split("T")[0];
      }

      // 使用user_id作为主键条件
      const params = {
        user_id: this.selectedMember.user_id, // 必须传递user_id
        nickname: this.selectedMember.nickname,
        tel: this.selectedMember.tel,
        birthday: birthday,
        level: this.selectedMember.level,
      };

      axios
        .put("user/updateUserLevel", {
          user_id: this.selectedMember.user_id,
          level: this.selectedMember.level,
        })
        .then((levelResponse) => {
          if (levelResponse.data.code === 200) {
            // 更新其他信息
            axios
              .put("user/xgUser", {
                tel: this.selectedMember.tel,
                nickname: this.selectedMember.nickname,
                xingbie: this.selectedMember.xingbie,
                birthday: birthday,
              })
              .then((infoResponse) => {
                if (infoResponse.data.code === 200) {
                  this.fetchMembers();
                  this.editDialogVisible = false;
                  Message.success("保存成功");
                } else {
                  Message.error("用户信息保存失败");
                }
              })
              .catch((error) => {
                Message.error("用户信息保存失败");
              });
          } else {
            Message.error("会员等级保存失败");
          }
        })
        .catch((error) => {
          Message.error("保存失败");
        });
    },
  },
  created() {
    this.fetchMembers();
  },
};
</script>

<style scoped>
.member-management {
  padding: 20px;
}
.level-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: 500;
}
.level-普通 {
  background-color: #f0f0f0;
  color: #666;
}
.level-黄金 {
  background-color: #fff3d4;
  color: #b8860b;
}
.level-钻石 {
  background-color: #e6f3ff;
  color: #1a73e8;
}
.privilege-list {
  list-style: none;
  padding-left: 0;
  margin: 0;
  font-size: 12px;
}
.privilege-list li {
  padding: 2px 0;
  margin-bottom: 2px;
}
</style>
