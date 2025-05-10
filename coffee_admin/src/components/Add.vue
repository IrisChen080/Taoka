<template>
  <div>
    <el-form ref="data" :model="obj" label-width="80px">
      <el-form-item label="咖啡名称">
        <el-input v-model="obj.title"></el-input>
      </el-form-item>
      <el-form-item label="咖啡原料">
        <el-input v-model="obj.ingredients"></el-input>
      </el-form-item>
      <el-form-item label="咖啡金额">
        <el-input v-model="obj.money"></el-input>
      </el-form-item>
      <el-form-item label="咖啡类型">
        <template>
          <el-radio-group v-model="obj.num" @change="changeRadio">
            <el-radio :label="item.fenlei_id" v-for="(item, index) in classList" :key="index" :value="item.text">{{item.text}}</el-radio>
          </el-radio-group>
        </template>
      </el-form-item>
      <el-form-item label="咖啡图片">
        <!-- <el-input v-model="obj.img"></el-input> -->
        <el-upload
    class="avatar-uploader"
    action="http://127.0.0.1:5000/upload"
    :show-file-list="false"
    :on-success="uploadSuccess"
    :before-upload="uploadBefore"
    accept="image/*"
   >
   	 <img v-if="imgUrl" :src="imgUrl" class="avatar" />
   	 <i v-else class="el-icon-plus avatar-uploader-icon"></i>
   </el-upload>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="btn">确认添加</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
export default {
  data() {
    return {
      classList:[],
      obj: {
        img: "", 
        title: "",
        ingredients: "", 
        fenlei_id: "", 
        money: "", 
      },
       imgUrl:"",
    };
  },
  created(){
    this.getClassList();
  },
  methods: {
     //图片上传成功
    uploadSuccess(res, file) {
      this.imgUrl = URL.createObjectURL(file.raw);
      this.obj.img = res.imgUrl; // 将图片路劲保存在数据库中
      console.log(this.obj.img)
      console.log(res.imgUrl)
    },
    //图片上传之前
    uploadBefore(file) {
      let limitMax = 5000 * 1024;
      if (file.size > limitMax) {
        this.$messageTips("大小超出限制");
        return false;
      }
    },

   // 获取分类
  async getClassList() {
      const { data: res } = await this.$http.get('getClassTabs')
      this.classList = res.list
  },

  
  // 点击确认，发布咖啡
    async btn() {
       console.log(this.title);
      const { data: res } = await this.$http.get("addData",{params:this.obj})
    
     this.$message.success("添加成功！");
       this.$router.push('/list') 
    },

    changeRadio(value){
      console.log(value);
      this.obj.fenlei_id=value
    }
  },
};
</script>

<style>
.avatar-uploader {
  width: 200px;
  height: 178px;
  border: 1px dashed gray;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.avatar-uploader .el-upload:hover {
  border-color: #409eff;
}
.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 200px;
  height: 178px;
  line-height: 178px;
  text-align: center;
}
.avatar {
  width: 200px;
  height: 178px;
  display: block;
}

</style>