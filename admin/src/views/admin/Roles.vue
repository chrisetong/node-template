<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessageBox } from "element-plus";
import { Plus, RefreshCw, Search, ShieldCheck } from "lucide-vue-next";
import { api } from "../../api";
import { Button } from "../../components/ui/button";
import AppDrawer from "../../components/common/AppDrawer.vue";
import { toast } from "../../components/ui/toast";
import type { UserRole } from "../../stores/auth";
type DataScope = "ALL"|"CUSTOM"|"DEPARTMENT"|"DEPARTMENT_AND_CHILDREN"|"SELF";
type Department={id:number;code:string;name:string;enabled:boolean};
type Role=UserRole&{createdAt:string;dataScope:DataScope;dataDepartments:{departmentId:number}[]};
const roles=ref<Role[]>([]),departments=ref<Department[]>([]),loading=ref(false),saving=ref(false),drawerOpen=ref(false),query=ref("");
const page=ref(1),pageSize=10;
const editing=ref<Role|null>(null);
const model=ref({code:"",name:"",dataScope:"DEPARTMENT" as DataScope,departmentIds:[] as number[]});
const scopeLabels:Record<DataScope,string>={ALL:"全部信息",CUSTOM:"指定部门",DEPARTMENT:"本部门",DEPARTMENT_AND_CHILDREN:"本部门及下级",SELF:"仅本人"};
const filtered=computed(()=>{const q=query.value.trim().toLowerCase();return q?roles.value.filter((r)=>r.name.toLowerCase().includes(q)||r.code.toLowerCase().includes(q)):roles.value;});
const paged=computed(()=>filtered.value.slice((page.value-1)*pageSize,page.value*pageSize));
async function load(){loading.value=true;try{const [r,d]=await Promise.all([api.get<Role[]>("/role"),api.get<Department[]>("/department")]);roles.value=r.data;departments.value=d.data.filter((x)=>x.enabled);}finally{loading.value=false;}}
function openCreate(){editing.value=null;model.value={code:"",name:"",dataScope:"DEPARTMENT",departmentIds:[]};drawerOpen.value=true;}
function openEdit(role:Role){editing.value=role;model.value={code:role.code,name:role.name,dataScope:role.dataScope,departmentIds:role.dataDepartments.map((d)=>d.departmentId)};drawerOpen.value=true;}
async function save(){if(saving.value)return;saving.value=true;try{if(editing.value){await api.patch(`/role/${editing.value.id}/data-scope`,{dataScope:model.value.dataScope,departmentIds:model.value.departmentIds});toast({title:"角色范围已更新"});}else{await api.post("/role",{code:model.value.code.trim().toUpperCase(),name:model.value.name.trim()});toast({title:"角色已创建"});}drawerOpen.value=false;await load();}finally{saving.value=false;}}
async function toggle(role:Role){try{await ElMessageBox.confirm(`确认${role.enabled?"停用":"启用"}“${role.name}”吗？`,"状态确认",{confirmButtonText:"确认",cancelButtonText:"取消",type:"warning"});}catch{return;}await api.patch(`/role/${role.id}`,{enabled:!role.enabled});toast({title:"角色状态已更新"});await load();}
onMounted(load);
</script>
<template>
  <div class="page-shell">
    <header class="page-header"><div><h1 class="page-title">角色管理</h1><p class="page-description">按职责设置可查看的信息范围，让团队分工清晰、协作边界明确。</p></div><div class="page-actions"><Button variant="secondary" :loading="loading" @click="load"><RefreshCw class="h-4 w-4"/>刷新</Button><Button v-permission="'role:create'" @click="openCreate"><Plus class="h-4 w-4"/>新增角色</Button></div></header>
    <section class="query-panel"><div class="field w-full sm:max-w-sm"><label for="role-query">搜索角色</label><div class="relative"><Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input id="role-query" v-model="query" class="app-input pl-10" placeholder="角色名称或编码" @input="page=1"/></div></div></section>
    <section class="table-panel"><div class="table-scroll"><table class="data-table"><thead><tr><th>角色</th><th>编码</th><th>信息范围</th><th>状态</th><th class="text-right">操作</th></tr></thead><tbody>
      <tr v-for="role in paged" :key="role.id"><td><div class="flex items-center gap-3"><span class="avatar small"><ShieldCheck class="h-4 w-4"/></span><strong>{{role.name}}</strong></div></td><td>{{role.code}}</td><td>{{scopeLabels[role.dataScope]}}</td><td><span class="status-pill" :class="role.enabled?'success':'muted'">{{role.enabled?"正常":"已停用"}}</span></td><td><div v-if="!role.isSuper" class="flex justify-end gap-2"><Button v-permission="'role:update'" size="sm" variant="ghost" @click="openEdit(role)">编辑范围</Button><Button v-permission="'role:update'" size="sm" variant="secondary" @click="toggle(role)">{{role.enabled?"停用":"启用"}}</Button></div><span v-else class="block text-right text-xs text-slate-400">系统角色</span></td></tr>
      <tr v-if="loading"><td colspan="5" class="empty-state">正在加载角色信息…</td></tr><tr v-else-if="!filtered.length"><td colspan="5" class="empty-state">没有找到符合条件的角色</td></tr>
    </tbody></table></div></section><footer class="flex flex-col items-center justify-between gap-3 sm:flex-row"><span class="text-xs text-slate-500">共 {{filtered.length}} 个角色</span><el-pagination v-model:current-page="page" background layout="prev, pager, next" :page-size="pageSize" :total="filtered.length" hide-on-single-page/></footer>
  </div>
  <AppDrawer v-model:open="drawerOpen" :title="editing?'编辑信息范围':'新增角色'" :description="editing?'选择此角色可以查看的信息范围。':'创建用于团队分工的新角色。'" :busy="saving">
    <div class="grid gap-5"><div v-if="!editing" class="field"><label for="role-name">角色名称</label><input id="role-name" v-model="model.name" class="app-input" placeholder="例如：运营主管"/></div><div v-if="!editing" class="field"><label for="role-code">角色编码</label><input id="role-code" v-model="model.code" class="app-input" placeholder="例如：OPERATIONS"/></div><template v-else><div class="field"><label>信息范围</label><el-select v-model="model.dataScope" class="w-full"><el-option v-for="(label,value) in scopeLabels" :key="value" :label="label" :value="value"/></el-select></div><div v-if="model.dataScope==='CUSTOM'" class="field"><label>可查看部门</label><el-select v-model="model.departmentIds" class="w-full" multiple placeholder="请选择部门"><el-option v-for="d in departments" :key="d.id" :label="d.name" :value="d.id"/></el-select></div></template></div>
    <template #footer><Button variant="secondary" :disabled="saving" @click="drawerOpen=false">取消</Button><Button :loading="saving" :disabled="editing?(model.dataScope==='CUSTOM'&&!model.departmentIds.length):(model.name.trim().length<2||model.code.trim().length<2)" @click="save">保存</Button></template>
  </AppDrawer>
</template>
