<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessageBox } from "element-plus";
import { Building2, Plus, RefreshCw, Search } from "lucide-vue-next";
import { api } from "../../api";
import { Button } from "../../components/ui/button";
import AppDrawer from "../../components/common/AppDrawer.vue";
import { toast } from "../../components/ui/toast";
type Department = { id: number; code: string; name: string; parentId: number | null; sort: number; enabled: boolean };
const departments = ref<Department[]>([]);
const loading = ref(false), saving = ref(false), drawerOpen = ref(false), query = ref("");
const page=ref(1),pageSize=10;
const model = ref({ code: "", name: "", parentId: null as number | null, sort: 0 });
const filtered = computed(() => { const q=query.value.trim().toLowerCase(); return q ? departments.value.filter((d)=>d.name.toLowerCase().includes(q)||d.code.toLowerCase().includes(q)) : departments.value; });
const paged=computed(()=>filtered.value.slice((page.value-1)*pageSize,page.value*pageSize));
async function load(){ loading.value=true; try{departments.value=(await api.get<Department[]>("/department")).data;}finally{loading.value=false;} }
function openCreate(){ model.value={code:"",name:"",parentId:null,sort:0}; drawerOpen.value=true; }
async function save(){ if(saving.value)return; saving.value=true; try{ await api.post("/department",model.value); toast({title:"部门已创建"}); drawerOpen.value=false; await load(); }finally{saving.value=false;} }
async function toggle(d:Department){try{await ElMessageBox.confirm(`确认${d.enabled?"停用":"启用"}“${d.name}”吗？`,"状态确认",{confirmButtonText:"确认",cancelButtonText:"取消",type:"warning"});}catch{return;}await api.patch(`/department/${d.id}`,{enabled:!d.enabled});toast({title:"部门状态已更新"});await load();}
function parentName(id:number|null){return departments.value.find((d)=>d.id===id)?.name??"—";}
onMounted(load);
</script>
<template>
  <div class="page-shell">
    <header class="page-header"><div><h1 class="page-title">部门管理</h1><p class="page-description">清晰维护组织层级和部门状态，帮助团队信息保持一致。</p></div><div class="page-actions"><Button variant="secondary" :loading="loading" @click="load"><RefreshCw class="h-4 w-4"/>刷新</Button><Button v-permission="'department:create'" @click="openCreate"><Plus class="h-4 w-4"/>新增部门</Button></div></header>
    <section class="query-panel"><div class="field w-full sm:max-w-sm"><label for="dept-query">搜索部门</label><div class="relative"><Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input id="dept-query" v-model="query" class="app-input pl-10" placeholder="部门名称或编码" @input="page=1"/></div></div></section>
    <section class="table-panel"><div class="table-scroll"><table class="data-table"><thead><tr><th>部门</th><th>编码</th><th>上级部门</th><th>顺序</th><th>状态</th><th class="text-right">操作</th></tr></thead><tbody>
      <tr v-for="item in paged" :key="item.id"><td><div class="flex items-center gap-3"><span class="avatar small"><Building2 class="h-4 w-4"/></span><strong>{{item.name}}</strong></div></td><td>{{item.code}}</td><td>{{parentName(item.parentId)}}</td><td>{{item.sort}}</td><td><span class="status-pill" :class="item.enabled?'success':'muted'">{{item.enabled?"正常":"已停用"}}</span></td><td><div class="flex justify-end gap-2"><Button v-permission="'department:update'" size="sm" variant="secondary" @click="toggle(item)">{{item.enabled?"停用":"启用"}}</Button></div></td></tr>
      <tr v-if="loading"><td colspan="6" class="empty-state">正在加载部门信息…</td></tr><tr v-else-if="!filtered.length"><td colspan="6" class="empty-state">没有找到符合条件的部门</td></tr>
    </tbody></table></div></section><footer class="flex flex-col items-center justify-between gap-3 sm:flex-row"><span class="text-xs text-slate-500">共 {{filtered.length}} 个部门</span><el-pagination v-model:current-page="page" background layout="prev, pager, next" :page-size="pageSize" :total="filtered.length" hide-on-single-page/></footer>
  </div>
  <AppDrawer v-model:open="drawerOpen" title="新增部门" description="完善部门名称、层级和展示顺序。" :busy="saving">
    <div class="grid gap-5"><div class="field"><label for="dept-name">部门名称</label><input id="dept-name" v-model="model.name" class="app-input" placeholder="请输入部门名称"/></div><div class="field"><label for="dept-code">部门编码</label><input id="dept-code" v-model="model.code" class="app-input" placeholder="例如：SALES"/></div><div class="field"><label>上级部门</label><el-select v-model="model.parentId" class="w-full" clearable placeholder="不选择则为顶级部门"><el-option v-for="d in departments.filter((item)=>item.enabled)" :key="d.id" :label="d.name" :value="d.id"/></el-select></div><div class="field"><label for="dept-sort">展示顺序</label><el-input-number id="dept-sort" v-model="model.sort" :min="0" class="!w-full"/></div></div>
    <template #footer><Button variant="secondary" :disabled="saving" @click="drawerOpen=false">取消</Button><Button :loading="saving" :disabled="model.name.trim().length<2||model.code.trim().length<2" @click="save">保存</Button></template>
  </AppDrawer>
</template>
