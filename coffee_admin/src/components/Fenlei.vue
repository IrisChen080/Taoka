<template>
    <div class="list">
        <!-- 面包屑导航区域 -->
        <el-breadcrumb separator-class="el-icon-arrow-right">
            <el-breadcrumb-item :to="{ path: '/home' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>菜单分类管理</el-breadcrumb-item>
            <el-breadcrumb-item>菜单分类列表</el-breadcrumb-item>
        </el-breadcrumb>

        <!-- 卡片视图区域 -->
        <el-card>
            <el-button type="primary" @click="openModal(true)">新增菜单分类</el-button>
            <!-- 菜单分类列表区域 -->
            <el-table :data="tableList" border stripe>
                <el-table-column label="序号" type="index"></el-table-column>
                <el-table-column label="菜单分类名称" prop="text"></el-table-column>
                <el-table-column label="操作" width="150px">
                    <template slot-scope="scope">
                        <!-- 修改按钮 -->
                        <el-button type="primary" icon="el-icon-edit" size="mini" @click="openModal(false,scope.row)"></el-button>
                        <!-- 删除按钮 -->
                        <el-button type="danger" icon="el-icon-delete" size="mini" @click="removeClass(scope.row)"></el-button>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>

        <!-- 新增 & 修改菜单分类内容区域 -->
        <el-dialog :title="isAdd ? '新增菜单分类' : '修改菜单分类'" :visible.sync="isModal" width="66%" @close="closeModal">
            <el-form :model="formSource" ref="formSourceRef" label-width="90px">
                <el-form-item label="修改类名" label-width="160px" required>
                    <el-input maxlength="6" v-model="className"></el-input>
                </el-form-item>
            </el-form>
            <span slot="footer" class="dialog-footer">
                <el-button type="primary" @click="setClass">确 定</el-button>
            </span>
        </el-dialog>
    </div>
</template>
<script>
export default {
    data() {
        return {
            className: '',
            isAdd: true, // 是否为新增菜单分类 默认是
            tableList: [], // 表格数据源
            isModal: false, // 控制对话框的显示与隐藏
            formSource: {
                fenlei_id: null, // 菜单分类id
                text: '', // 菜单分类名称
            }, // 表单数据
        }
    },
    created() {
        this.getClassList() // 获取菜单分类
    },
    methods: {
        // 获取菜单分类
        async getClassList() {
            const { data: res } = await this.$http.get('category/getClassTabs')
                this.tableList = res.list
        },
        // 打开弹框
        openModal(type, data) {
            this.className = ""
            this.isAdd = type
            this.isModal = true
            if (!type) {
                // 如果是编辑 那么拿一下编辑的内容
                this.formSource = data
                console.log(data,'==========data');
                this.className = data.text
            }
        },
        // 修改菜单分类
        async setClass() {
            if (this.isAdd) {
                // 新增菜单分类
                const { data: res } = await this.$http.get('category/addClassTabs', {params:{ text: this.className }})
                    this.isModal = false
                    this.getClassList()
                    console.log(res)
                     this.$message.success("添加成功！");
            } else {
                // 修改菜单分类
                const { data: res } = await this.$http.get('category/updateClassTabs', {params:{ text: this.className, fenlei_id: this.formSource.fenlei_id }})
                    this.getClassList()
                    console.log(res)
                    this.isModal = false
                    this.$message.success("修改成功！");
            }
        },
        // 删除菜单分类
        removeClass(data) {
            this.$confirm('此操作将无法恢复, 是否继续?', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning',
            })
                .then(async () => {
                    const { data: res } = await this.$http.get('category/delClassTabs', {params:{ fenlei_id: data.fenlei_id }})
                    this.getClassList()
                    console.log(res)
                })
                .catch(() => {})
        },

        // 关闭修改对话框
        closeModal() {
            this.formSource = {
                id: null, // 菜单分类id
                class_name: '', // 菜单分类名称
            }
            this.$refs.formSourceRef.resetFields()
        },
    },
}
</script>
<style lang="less" scoped>
</style>